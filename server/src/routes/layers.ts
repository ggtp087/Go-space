import { Router } from 'express'
import { query } from '../db.js'
import { OPS_TYPE_KEY_BY_ID } from '../opsTypes.js'
import { parseInteger, parseRequiredBbox, parseZoom, type Bbox } from '../validate.js'
import { resolveYear } from '../years.js'

// Zoomed-in map layers, always requested for the current viewport.
// - bbox is transformed to EPSG:32647 (the geometry column is never
//   transformed, so the GiST indexes on road_geom / pop_grid_geom /
//   ops_geom are used);
// - a row LIMIT is a safety net: one extra row is fetched to tell the client
//   the layer was cut off (`truncated`), rather than silently dropping rows;
// - geometry is simplified in metres according to the zoom.

export const layersRouter = Router()

/** Largest viewport side accepted, in degrees (~28 km) — far more than a zoom-15 screen. */
const MAX_SPAN_DEG = 0.25

function bboxFilter(column: string, firstParam: number): string {
  return `${column} && ST_Transform(ST_MakeEnvelope($${firstParam}, $${firstParam + 1}, $${firstParam + 2}, $${firstParam + 3}, 4326), 32647)`
}

/** Simplification tolerance (m) for a zoom: about a third of a screen pixel, 0 once vertices are already finer than that. */
function toleranceFor(zoom: number, base: number): number {
  return zoom >= 17 ? 0 : base / 2 ** (zoom - 14)
}

function geojsonExpr(column: string, toleranceM: number): string {
  const geom = toleranceM > 0 ? `ST_SimplifyPreserveTopology(${column}, ${toleranceM})` : column
  return `ST_AsGeoJSON(ST_Transform(${geom}, 4326), 6)::json`
}

function limited<T>(rows: T[], limit: number): { rows: T[]; truncated: boolean } {
  return rows.length > limit ? { rows: rows.slice(0, limit), truncated: true } : { rows, truncated: false }
}

const ROADS_MIN_ZOOM = 15
const ROADS_LIMIT = 25_000

/**
 * GET /api/roads?bbox=&zoom= (zoom >= 15)
 * The walkable road network used in the analysis (spatial.road_networks —
 * non-walkable segments were removed in ETL and never loaded).
 */
layersRouter.get('/roads', async (req, res) => {
  const zoom = parseZoom(req.query.zoom, ROADS_MIN_ZOOM)
  const bbox: Bbox = parseRequiredBbox(req.query.bbox, MAX_SPAN_DEG)
  const tolerance = toleranceFor(zoom, 4)
  const rows = await query<{ road_id: number; geometry: unknown }>(
    'roads',
    `select road_id, ${geojsonExpr('road_geom', tolerance)} as geometry
       from spatial.road_networks
      where ${bboxFilter('road_geom', 1)}
      limit ${ROADS_LIMIT + 1}`,
    bbox,
  )
  const { rows: kept, truncated } = limited(rows, ROADS_LIMIT)
  res.json({
    type: 'FeatureCollection',
    zoom,
    truncated,
    features: kept.map((r) => ({ type: 'Feature', geometry: r.geometry, properties: { road_id: r.road_id } })),
  })
})

const GRID_MIN_ZOOM = 15
const GRID_LIMIT = 20_000

// Whether a year has adjusted_population at all (2026 has none until its
// registry figures exist) — checked once per year, it never changes at runtime.
const gridYearHasValues = new Map<number, boolean>()

async function yearHasAdjustedPopulation(year: number): Promise<boolean> {
  const cached = gridYearHasValues.get(year)
  if (cached !== undefined) return cached
  const rows = await query<{ ok: boolean }>(
    'grid year check',
    'select exists (select 1 from spatial.population_grids where year = $1 and adjusted_population is not null) as ok',
    [year],
  )
  const ok = Boolean(rows[0]?.ok)
  gridYearHasValues.set(year, ok)
  return ok
}

/**
 * GET /api/population-grid?year=&bbox=&zoom= (zoom >= 15)
 * WorldPop cells (clipped by sub-district) with adjusted_population for the
 * year. A year without adjusted values returns status "pending" and no cells.
 */
layersRouter.get('/population-grid', async (req, res) => {
  const year = parseInteger(req.query.year, 'year')
  const zoom = parseZoom(req.query.zoom, GRID_MIN_ZOOM)
  const bbox = parseRequiredBbox(req.query.bbox, MAX_SPAN_DEG)
  await resolveYear(year)

  if (!(await yearHasAdjustedPopulation(year))) {
    res.json({ type: 'FeatureCollection', year, zoom, status: 'pending', truncated: false, features: [] })
    return
  }

  const rows = await query<{ pop_grid_id: number; adjusted_population: number; geometry: unknown }>(
    'population grid',
    `select pop_grid_id, adjusted_population, ST_AsGeoJSON(ST_Transform(pop_grid_geom, 4326), 6)::json as geometry
       from spatial.population_grids
      where year = $1 and adjusted_population is not null and ${bboxFilter('pop_grid_geom', 2)}
      limit ${GRID_LIMIT + 1}`,
    [year, ...bbox],
  )
  const { rows: kept, truncated } = limited(rows, GRID_LIMIT)
  res.json({
    type: 'FeatureCollection',
    year,
    zoom,
    status: 'ok',
    truncated,
    features: kept.map((r) => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: { pop_grid_id: r.pop_grid_id, adjusted_population: r.adjusted_population },
    })),
  })
})

const OPS_POLYGON_MIN_ZOOM = 15
const OPS_POLYGON_LIMIT = 3_000

/**
 * GET /api/ops-polygons?year=&bbox=&zoom= (zoom >= 15)
 * OPS open in the year (opened_year <= year) as their real polygons.
 */
layersRouter.get('/ops-polygons', async (req, res) => {
  const year = parseInteger(req.query.year, 'year')
  const zoom = parseZoom(req.query.zoom, OPS_POLYGON_MIN_ZOOM)
  const bbox = parseRequiredBbox(req.query.bbox, MAX_SPAN_DEG)
  await resolveYear(year)
  const tolerance = toleranceFor(zoom, 4)

  const rows = await query<{ ops_id: number; ops_type_id: number; geometry: unknown }>(
    'ops polygons',
    `select ops_id, ops_type_id, ${geojsonExpr('ops_geom', tolerance)} as geometry
       from spatial.open_public_spaces
      where opened_year <= $1 and ${bboxFilter('ops_geom', 2)}
      order by ops_area_sqm desc, ops_id
      limit ${OPS_POLYGON_LIMIT + 1}`,
    [year, ...bbox],
  )
  const { rows: kept, truncated } = limited(rows, OPS_POLYGON_LIMIT)
  res.json({
    type: 'FeatureCollection',
    zoom,
    truncated,
    features: kept.map((r) => ({
      type: 'Feature',
      geometry: r.geometry,
      properties: { ops_id: r.ops_id, ops_type: OPS_TYPE_KEY_BY_ID[r.ops_type_id] },
    })),
  })
})

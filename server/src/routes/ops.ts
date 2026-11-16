import { Router } from 'express'
import { query } from '../db.js'
import { OPS_TYPE_ID_BY_KEY, OPS_TYPE_KEYS, OPS_TYPE_KEY_BY_ID } from '../opsTypes.js'
import { HttpError, badRequest, parseAreaCode, parseBbox, parseEnum, parseInteger, type Bbox } from '../validate.js'
import { resolveYear } from '../years.js'

export const opsRouter = Router()

// Geometry is stored in UTM 47N (SRID 32647, metres). Responses are WGS 84
// GeoJSON with 6 decimals (~0.1 m), simplified in metres before transforming.
const SIMPLIFY_DETAIL_M = 5
const SIMPLIFY_LAYER_M = 10

/** "<geom> && bbox" with the bbox transformed to 32647 — the geometry column is never transformed, so its GiST index is used. */
function bboxFilter(column: string, firstParam: number): string {
  return `${column} && ST_Transform(ST_MakeEnvelope($${firstParam}, $${firstParam + 1}, $${firstParam + 2}, $${firstParam + 3}, 4326), 32647)`
}

type OpsRow = {
  ops_id: number
  ops_name_th: string
  ops_name_en: string | null
  ops_type_id: number
  ops_area_sqm: number
  opened_year: number
  subdistrict_id: string
  district_id: string
  geometry: unknown
}

function opsProperties(row: OpsRow) {
  return {
    ops_id: row.ops_id,
    name_th: row.ops_name_th,
    name_en: row.ops_name_en,
    ops_type: OPS_TYPE_KEY_BY_ID[row.ops_type_id],
    ops_area_sqm: row.ops_area_sqm,
    opened_year: row.opened_year,
    subdistrict_id: row.subdistrict_id,
    district_id: row.district_id,
  }
}

/**
 * GET /api/ops?year=&bbox=[&type=]
 * OPS open in the year (opened_year <= year), as marker points
 * (ST_PointOnSurface — always inside the polygon), largest first so small
 * markers draw on top.
 */
opsRouter.get('/ops', async (req, res) => {
  const year = parseInteger(req.query.year, 'year')
  const bbox = parseBbox(req.query.bbox)
  const type = req.query.type === undefined ? undefined : parseEnum(req.query.type, 'type', OPS_TYPE_KEYS)
  await resolveYear(year)

  const params: unknown[] = [year]
  const where = ['o.opened_year <= $1']
  if (bbox) {
    where.push(bboxFilter('o.ops_geom', params.length + 1))
    params.push(...bbox)
  }
  if (type) {
    params.push(OPS_TYPE_ID_BY_KEY[type])
    where.push(`o.ops_type_id = $${params.length}`)
  }

  const rows = await query<OpsRow>(
    'ops markers',
    `select o.ops_id, o.ops_name_th, o.ops_name_en, o.ops_type_id, o.ops_area_sqm, o.opened_year,
            s.subdistrict_code as subdistrict_id, d.district_code as district_id,
            ST_AsGeoJSON(ST_Transform(ST_PointOnSurface(o.ops_geom), 4326), 6)::json as geometry
       from spatial.open_public_spaces o
       join spatial.subdistricts s on s.subdistrict_id = o.primary_subdistrict_id
       join spatial.districts d on d.district_id = s.district_id
      where ${where.join(' and ')}
      order by o.ops_area_sqm desc, o.ops_id`,
    params,
  )

  res.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({ type: 'Feature', geometry: row.geometry, properties: opsProperties(row) })),
  })
})

/**
 * GET /api/ops/nearby?area=<district or sub-district code>&year=
 * OPS open in the year within 400 m (the walking distance used in the
 * analysis) of the area, nearest to the area's interior point first.
 */
opsRouter.get('/ops/nearby', async (req, res) => {
  const area = parseAreaCode(req.query.area)
  if (area === 'bangkok') throw badRequest('area must be a district or sub-district code')
  const year = parseInteger(req.query.year, 'year')
  await resolveYear(year)

  const rows = await query<OpsRow & { distance_m: number; inside_area: boolean }>(
    'ops nearby',
    `with area as (
       select district_geom as geom from spatial.districts where district_code = $1
       union all
       select subdistrict_geom from spatial.subdistricts where subdistrict_code = $1
     ), anchor as (
       select geom, ST_PointOnSurface(geom) as pt from area
     )
     select o.ops_id, o.ops_name_th, o.ops_name_en, o.ops_type_id, o.ops_area_sqm, o.opened_year,
            s.subdistrict_code as subdistrict_id, d.district_code as district_id,
            ST_AsGeoJSON(ST_Transform(ST_PointOnSurface(o.ops_geom), 4326), 6)::json as geometry,
            ST_Distance(o.ops_geom, anchor.pt) as distance_m,
            ST_Intersects(o.ops_geom, anchor.geom) as inside_area
       from anchor
       join spatial.open_public_spaces o on ST_DWithin(o.ops_geom, anchor.geom, 400)
       join spatial.subdistricts s on s.subdistrict_id = o.primary_subdistrict_id
       join spatial.districts d on d.district_id = s.district_id
      where o.opened_year <= $2
      order by distance_m, o.ops_id
      limit 20`,
    [area, year],
  )
  if (rows.length === 0) {
    const known = await query<{ ok: boolean }>(
      'nearby area check',
      `select exists (select 1 from spatial.districts where district_code = $1)
           or exists (select 1 from spatial.subdistricts where subdistrict_code = $1) as ok`,
      [area],
    )
    if (!known[0]?.ok) throw new HttpError(404, `Unknown area ${area}`)
  }

  res.json({
    area,
    year,
    items: rows.map((row) => ({ ...opsProperties(row), distance_m: row.distance_m, inside_area: row.inside_area, geometry: row.geometry })),
  })
})

/**
 * GET /api/ops/:ops_id?year=
 * One OPS: polygon, entrances, and its analysis for the year — reachable
 * network (+ length), 400 m service area (+ area), and population covered.
 * population_covered is per-OPS only (overlay_results) and is null while the
 * year's population results are pending. Never sum it across OPS.
 */
opsRouter.get('/ops/:ops_id', async (req, res) => {
  const opsId = parseInteger(req.params.ops_id, 'ops_id')
  const year = parseInteger(req.query.year, 'year')
  const info = await resolveYear(year)

  const ops = await query<OpsRow & { polygon: unknown }>(
    'ops detail',
    `select o.ops_id, o.ops_name_th, o.ops_name_en, o.ops_type_id, o.ops_area_sqm, o.opened_year,
            s.subdistrict_code as subdistrict_id, d.district_code as district_id,
            ST_AsGeoJSON(ST_Transform(ST_PointOnSurface(o.ops_geom), 4326), 6)::json as geometry,
            ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(o.ops_geom, ${SIMPLIFY_DETAIL_M}), 4326), 6)::json as polygon
       from spatial.open_public_spaces o
       join spatial.subdistricts s on s.subdistrict_id = o.primary_subdistrict_id
       join spatial.districts d on d.district_id = s.district_id
      where o.ops_id = $1`,
    [opsId],
  )
  const row = ops[0]
  if (!row) throw new HttpError(404, `Unknown ops_id ${opsId}`)
  if (row.opened_year > year) throw new HttpError(404, `OPS ${opsId} opened in ${row.opened_year}, after ${year}`)

  const [entrances, analysis] = await Promise.all([
    query<{ entrance_id: number; entrance_name: string | null; geometry: unknown }>(
      'ops entrances',
      `select entrance_id, entrance_name, ST_AsGeoJSON(ST_Transform(entrance_geom, 4326), 6)::json as geometry
         from spatial.open_public_space_entrances where ops_id = $1 order by entrance_id`,
      [opsId],
    ),
    query<{
      network_length_m: number | null
      network: unknown
      service_area_sqm: number | null
      service_area: unknown
      population_covered: number | null
    }>(
      'ops analysis',
      `select ST_Length(n.network_result_geom) as network_length_m,
              ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(n.network_result_geom, ${SIMPLIFY_DETAIL_M}), 4326), 6)::json as network,
              sa.service_area_sqm,
              ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(sa.service_area_geom, ${SIMPLIFY_DETAIL_M}), 4326), 6)::json as service_area,
              ov.population_covered
         from (select $1::int as ops_id, $2::int as analysis_id) x
         left join spatial.network_analysis_results n on n.ops_id = x.ops_id and n.analysis_id = x.analysis_id
         left join spatial.service_area_results sa on sa.ops_id = x.ops_id and sa.analysis_id = x.analysis_id
         left join spatial.overlay_results ov on ov.ops_id = x.ops_id and ov.analysis_id = x.analysis_id`,
      [opsId, info.analysis_id],
    ),
  ])

  const a = analysis[0]
  res.json({
    ...opsProperties(row),
    geometry: row.geometry,
    polygon: row.polygon,
    entrances: entrances.map((e) => ({ entrance_id: e.entrance_id, name: e.entrance_name, geometry: e.geometry })),
    analysis: {
      year,
      analysis_id: info.analysis_id,
      network_length_m: a?.network_length_m ?? null,
      network: a?.network ?? null,
      service_area_sqm: a?.service_area_sqm ?? null,
      service_area: a?.service_area ?? null,
      population_covered: a?.population_covered ?? null,
      population_status: a?.population_covered == null ? 'pending' : 'ok',
    },
  })
})

/**
 * GET /api/service-areas?year=&bbox=[&type=]
 * Every OPS's 400 m service area for the year (simplified ~10 m), for the
 * map's "all service areas" layer.
 */
opsRouter.get('/service-areas', async (req, res) => {
  const year = parseInteger(req.query.year, 'year')
  const bbox: Bbox | undefined = parseBbox(req.query.bbox)
  const type = req.query.type === undefined ? undefined : parseEnum(req.query.type, 'type', OPS_TYPE_KEYS)
  const info = await resolveYear(year)

  const params: unknown[] = [info.analysis_id]
  const where = ['sa.analysis_id = $1']
  if (bbox) {
    where.push(bboxFilter('sa.service_area_geom', params.length + 1))
    params.push(...bbox)
  }
  if (type) {
    params.push(OPS_TYPE_ID_BY_KEY[type])
    where.push(`o.ops_type_id = $${params.length}`)
  }

  const rows = await query<{ ops_id: number; ops_type_id: number; service_area_sqm: number; geometry: unknown }>(
    'service areas',
    `select sa.ops_id, o.ops_type_id, sa.service_area_sqm,
            ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(sa.service_area_geom, ${SIMPLIFY_LAYER_M}), 4326), 6)::json as geometry
       from spatial.service_area_results sa
       join spatial.open_public_spaces o on o.ops_id = sa.ops_id
      where ${where.join(' and ')}
      order by sa.ops_id`,
    params,
  )

  res.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: { ops_id: row.ops_id, ops_type: OPS_TYPE_KEY_BY_ID[row.ops_type_id], service_area_sqm: row.service_area_sqm },
    })),
  })
})

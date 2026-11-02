import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'

// Map geometry for the GIS basemap — the one district/sub-district id and
// boundary source for the whole app (Map, Dashboard, and Compare all read
// assessment figures keyed to these ids via mock/assessmentResults.ts). A
// placeholder the real backend will eventually replace.
//
// Everything here is generated deterministically from fixed constants (no
// Math.random), so the shapes are stable across reloads and between runs.

export type DistrictProperties = { id: string; name: string; name_th: string }
export type SubDistrictProperties = { id: string; name: string; name_th: string; district_id: string }

// Rough target extent for the outline, per spec: lat 13.49-13.96, lon 100.33-100.94.
export const OUTLINE_CENTER: Position = [100.635, 13.725] // [lon, lat]
const OUTLINE_VERTEX_COUNT = 26

/** A closed ring loosely filling the target lat/lon box — not a real coastline, just a rough blob. */
function buildOutlineRing(): Position[] {
  const ring: Position[] = []
  for (let i = 0; i < OUTLINE_VERTEX_COUNT; i++) {
    const angle = (i / OUTLINE_VERTEX_COUNT) * Math.PI * 2
    const radiusLon = 0.2 + 0.05 * Math.sin(3 * angle + 0.7) + 0.02 * Math.cos(7 * angle + 0.3)
    const radiusLat = 0.15 + 0.045 * Math.cos(3 * angle + 0.7) + 0.018 * Math.sin(7 * angle + 0.3)
    ring.push([OUTLINE_CENTER[0] + Math.cos(angle) * radiusLon, OUTLINE_CENTER[1] + Math.sin(angle) * radiusLat])
  }
  ring.push(ring[0]) // GeoJSON rings must be closed
  return ring
}

export const bangkokOutlineRing = buildOutlineRing()

/** Standard ray-casting point-in-polygon test; [lon, lat] order, matching GeoJSON. */
export function isPointInRing(point: Position, ring: Position[]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function isPointInBangkokOutline(point: Position): boolean {
  return isPointInRing(point, bangkokOutlineRing)
}

// Equirectangular approximation for converting a ring's own lon/lat degrees
// to meters — fine at the scale of a single sub-district, and consistent
// with Bangkok's ~13.75°N latitude affecting how much a degree of longitude
// is worth in meters (a degree of latitude is ~constant everywhere).
const METERS_PER_DEGREE_LAT = 110_574
function metersPerDegreeLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180)
}

/** Shoelace-formula area of a closed ring, in m². */
export function ringAreaSqm(ring: Position[]): number {
  const refLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  const mLon = metersPerDegreeLon(refLat)
  const points = ring.map(([lon, lat]): Position => [lon * mLon, lat * METERS_PER_DEGREE_LAT])
  let sum = 0
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

function rectangleRing(minLon: number, minLat: number, maxLon: number, maxLat: number): Position[] {
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat],
  ]
}

// Sub-district grid: a simple rectangular tiling over the outline's bounding
// box, keeping only cells whose center falls inside the outline — "clipped"
// in the loose sense the mock data calls for, not a true polygon clip.
const GRID_LON_MIN = 100.33
const GRID_LON_MAX = 100.94
const GRID_LAT_MIN = 13.49
const GRID_LAT_MAX = 13.96
const GRID_COLS = 13
const GRID_ROWS = 11

// Districts are a coarser partition of the same box; only macro-cells that
// end up containing at least one surviving sub-district become a district.
const DISTRICT_COLS = 4
const DISTRICT_ROWS = 4

type GridCell = { col: number; row: number; minLon: number; minLat: number; maxLon: number; maxLat: number; centerLon: number; centerLat: number }

function buildGrid(cols: number, rows: number): GridCell[] {
  const cellW = (GRID_LON_MAX - GRID_LON_MIN) / cols
  const cellH = (GRID_LAT_MAX - GRID_LAT_MIN) / rows
  const cells: GridCell[] = []
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const minLon = GRID_LON_MIN + col * cellW
      const minLat = GRID_LAT_MIN + row * cellH
      const maxLon = minLon + cellW
      const maxLat = minLat + cellH
      cells.push({ col, row, minLon, minLat, maxLon, maxLat, centerLon: (minLon + maxLon) / 2, centerLat: (minLat + maxLat) / 2 })
    }
  }
  return cells
}

function districtMacroCellFor(lon: number, lat: number): { col: number; row: number } {
  const cellW = (GRID_LON_MAX - GRID_LON_MIN) / DISTRICT_COLS
  const cellH = (GRID_LAT_MAX - GRID_LAT_MIN) / DISTRICT_ROWS
  const col = Math.min(DISTRICT_COLS - 1, Math.floor((lon - GRID_LON_MIN) / cellW))
  const row = Math.min(DISTRICT_ROWS - 1, Math.floor((lat - GRID_LAT_MIN) / cellH))
  return { col, row }
}

function buildBoundaries(): {
  districts: FeatureCollection<MultiPolygon, DistrictProperties>
  subDistricts: FeatureCollection<Polygon, SubDistrictProperties>
} {
  const subDistrictCells = buildGrid(GRID_COLS, GRID_ROWS).filter((cell) =>
    isPointInBangkokOutline([cell.centerLon, cell.centerLat]),
  )

  // The macro-grid is only a deterministic GROUPING key here: each
  // sub-district's center falls in exactly one macro-cell, which is why
  // `district_id` below is single-valued by construction (every sub-district
  // gets exactly one). It is NOT used to draw the district's own shape
  // anymore — see districtFeatures below.
  const districtKeyToId = new Map<string, string>()
  let nextDistrictNumber = 1

  const subDistrictFeatures: Feature<Polygon, SubDistrictProperties>[] = subDistrictCells.map((cell, index) => {
    const macro = districtMacroCellFor(cell.centerLon, cell.centerLat)
    const key = `${macro.col}-${macro.row}`
    let districtId = districtKeyToId.get(key)
    if (!districtId) {
      districtId = `geo-district-${nextDistrictNumber}`
      districtKeyToId.set(key, districtId)
      nextDistrictNumber += 1
    }

    const id = `geo-subdistrict-${index + 1}`
    return {
      type: 'Feature',
      properties: { id, name: `Sub-district ${index + 1}`, name_th: `แขวง ${index + 1}`, district_id: districtId },
      geometry: { type: 'Polygon', coordinates: [rectangleRing(cell.minLon, cell.minLat, cell.maxLon, cell.maxLat)] },
    }
  })

  // A district's geometry is the union of its own sub-districts' rectangles
  // — a MultiPolygon made of their exact cells — rather than a separately
  // drawn macro-grid rectangle. That guarantees it can never extend past (or
  // overlap a neighboring district's) sub-district area, since sub-district
  // cells themselves never overlap each other.
  const memberCellsByDistrict = new Map<string, Feature<Polygon, SubDistrictProperties>[]>()
  for (const feature of subDistrictFeatures) {
    const list = memberCellsByDistrict.get(feature.properties.district_id) ?? []
    list.push(feature)
    memberCellsByDistrict.set(feature.properties.district_id, list)
  }

  const districtFeatures: Feature<MultiPolygon, DistrictProperties>[] = Array.from(memberCellsByDistrict.entries()).map(
    ([districtId, members], index) => ({
      type: 'Feature',
      properties: { id: districtId, name: `District ${index + 1}`, name_th: `เขต ${index + 1}` },
      geometry: { type: 'MultiPolygon', coordinates: members.map((feature) => feature.geometry.coordinates) },
    }),
  )

  return {
    districts: { type: 'FeatureCollection', features: districtFeatures },
    subDistricts: { type: 'FeatureCollection', features: subDistrictFeatures },
  }
}

const { districts: mockDistrictBoundaries, subDistricts: mockSubDistrictBoundaries } = buildBoundaries()
export { mockDistrictBoundaries, mockSubDistrictBoundaries }

if (import.meta.env.DEV) validateSubDistrictAssignment()

/**
 * Dev-only guard for the rule the rest of this module relies on: every
 * sub-district id is unique and belongs to exactly one district. A failure
 * here means a future edit to the grouping/grid logic broke that invariant.
 */
function validateSubDistrictAssignment(): void {
  const districtIdsById = new Map<string, Set<string>>()

  for (const feature of mockSubDistrictBoundaries.features) {
    const { id, district_id } = feature.properties
    const districtIds = districtIdsById.get(id)
    if (districtIds) console.error(`[mapBoundaries] duplicate sub-district id: ${id}`)
    const set = districtIds ?? new Set<string>()
    if (district_id) set.add(district_id)
    districtIdsById.set(id, set)
  }

  for (const [id, districtIds] of districtIdsById) {
    if (districtIds.size !== 1) {
      console.error(`[mapBoundaries] sub-district ${id} maps to ${districtIds.size} districts: ${[...districtIds].join(', ')}`)
    }
  }
}

export function getSubDistrictFeature(id: string): Feature<Polygon, SubDistrictProperties> | undefined {
  return mockSubDistrictBoundaries.features.find((feature) => feature.properties.id === id)
}

export function getDistrictFeature(id: string): Feature<MultiPolygon, DistrictProperties> | undefined {
  return mockDistrictBoundaries.features.find((feature) => feature.properties.id === id)
}

/** Which sub-district a point falls in — used to tag mock OPS points at generation time. */
export function findSubDistrictId(point: Position): string {
  const containing = mockSubDistrictBoundaries.features.find((feature) =>
    isPointInRing(point, feature.geometry.coordinates[0]),
  )
  if (containing) return containing.properties.id

  // Rare fallback for a point that lands in a grid gap between surviving
  // cells (sub-districts are filtered by cell-center containment, not exact
  // coverage) — fall back to whichever sub-district's center is nearest.
  let nearestId = mockSubDistrictBoundaries.features[0].properties.id
  let nearestDistSq = Infinity
  for (const feature of mockSubDistrictBoundaries.features) {
    const ring = feature.geometry.coordinates[0]
    const centerLon = (ring[0][0] + ring[2][0]) / 2
    const centerLat = (ring[0][1] + ring[2][1]) / 2
    const distSq = (centerLon - point[0]) ** 2 + (centerLat - point[1]) ** 2
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq
      nearestId = feature.properties.id
    }
  }
  return nearestId
}

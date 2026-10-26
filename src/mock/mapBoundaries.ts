import type { Feature, FeatureCollection, Polygon, Position } from 'geojson'

// Generic mock map geometry for the GIS basemap — independent of the
// district/sub-district dataset in mock/districts.ts and mock/subdistricts.ts
// (those drive the Dashboard/Compare stats; these drive what's drawn on the
// map). Both are placeholders the real backend will eventually replace, and
// there's no requirement that their counts or boundaries line up.
//
// Everything here is generated deterministically from fixed constants (no
// Math.random), so the shapes are stable across reloads and between runs.

export type DistrictProperties = { id: string; name: string }
export type SubDistrictProperties = { id: string; name: string; district_id: string }

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
  districts: FeatureCollection<Polygon, DistrictProperties>
  subDistricts: FeatureCollection<Polygon, SubDistrictProperties>
} {
  const subDistrictCells = buildGrid(GRID_COLS, GRID_ROWS).filter((cell) =>
    isPointInBangkokOutline([cell.centerLon, cell.centerLat]),
  )

  // Assign each surviving sub-district cell to its macro-cell, and give each
  // populated macro-cell a sequential district id/name in scan order.
  const districtKeyToId = new Map<string, string>()
  const districtCells = new Map<string, { col: number; row: number }>()
  let nextDistrictNumber = 1

  const subDistrictFeatures: Feature<Polygon, SubDistrictProperties>[] = subDistrictCells.map((cell, index) => {
    const macro = districtMacroCellFor(cell.centerLon, cell.centerLat)
    const key = `${macro.col}-${macro.row}`
    let districtId = districtKeyToId.get(key)
    if (!districtId) {
      districtId = `geo-district-${nextDistrictNumber}`
      districtKeyToId.set(key, districtId)
      districtCells.set(districtId, macro)
      nextDistrictNumber += 1
    }

    const id = `geo-subdistrict-${index + 1}`
    return {
      type: 'Feature',
      properties: { id, name: `Sub-district ${index + 1}`, district_id: districtId },
      geometry: { type: 'Polygon', coordinates: [rectangleRing(cell.minLon, cell.minLat, cell.maxLon, cell.maxLat)] },
    }
  })

  const districtW = (GRID_LON_MAX - GRID_LON_MIN) / DISTRICT_COLS
  const districtH = (GRID_LAT_MAX - GRID_LAT_MIN) / DISTRICT_ROWS
  const districtFeatures: Feature<Polygon, DistrictProperties>[] = Array.from(districtCells.entries()).map(
    ([districtId, macro], index) => {
      const minLon = GRID_LON_MIN + macro.col * districtW
      const minLat = GRID_LAT_MIN + macro.row * districtH
      return {
        type: 'Feature',
        properties: { id: districtId, name: `District ${index + 1}` },
        geometry: { type: 'Polygon', coordinates: [rectangleRing(minLon, minLat, minLon + districtW, minLat + districtH)] },
      }
    },
  )

  return {
    districts: { type: 'FeatureCollection', features: districtFeatures },
    subDistricts: { type: 'FeatureCollection', features: subDistrictFeatures },
  }
}

const { districts: mockDistrictBoundaries, subDistricts: mockSubDistrictBoundaries } = buildBoundaries()
export { mockDistrictBoundaries, mockSubDistrictBoundaries }

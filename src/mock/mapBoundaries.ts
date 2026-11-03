import type { Feature, FeatureCollection, MultiPolygon, Position } from 'geojson'
import districtsRaw from '../data/boundaries/districts.geojson?raw'
import subdistrictsRaw from '../data/boundaries/subdistricts.geojson?raw'
import bangkokRaw from '../data/boundaries/bangkok.geojson?raw'

// Real Bangkok admin boundaries (QGIS-prepared, EPSG:4326, RFC 7946,
// coverage-simplified so neighbours share identical edges) — the one
// district/sub-district id and boundary source for the whole app (Map,
// Dashboard, and Compare all read assessment figures keyed to these ids via
// mock/assessmentResults.ts). Imported statically for now; a real backend
// will eventually serve these instead.

export type DistrictProperties = { id: string; name: string; name_th: string; area_sqm: number }
export type SubDistrictProperties = { id: string; name: string; name_th: string; district_id: string; area_sqm: number }

type RawDistrictProperties = { district_code: string; district_name_th: string; district_name_en: string; area_sqm: number }
type RawSubDistrictProperties = {
  subdistrict_code: string
  subdistrict_name_th: string
  subdistrict_name_en: string
  district_code: string
  district_name_th: string
  district_name_en: string
  area_sqm: number
}
type RawBangkokProperties = { province_code: string; name_th: string; name_en: string; area_sqm: number }

const rawDistricts = JSON.parse(districtsRaw) as FeatureCollection<MultiPolygon, RawDistrictProperties>
const rawSubDistricts = JSON.parse(subdistrictsRaw) as FeatureCollection<MultiPolygon, RawSubDistrictProperties>
const rawBangkok = JSON.parse(bangkokRaw) as FeatureCollection<MultiPolygon, RawBangkokProperties>

export const mockDistrictBoundaries: FeatureCollection<MultiPolygon, DistrictProperties> = {
  type: 'FeatureCollection',
  features: rawDistricts.features.map((feature) => ({
    type: 'Feature',
    properties: {
      id: feature.properties.district_code,
      name: feature.properties.district_name_en,
      name_th: feature.properties.district_name_th,
      area_sqm: feature.properties.area_sqm,
    },
    geometry: feature.geometry,
  })),
}

export const mockSubDistrictBoundaries: FeatureCollection<MultiPolygon, SubDistrictProperties> = {
  type: 'FeatureCollection',
  features: rawSubDistricts.features.map((feature) => ({
    type: 'Feature',
    properties: {
      id: feature.properties.subdistrict_code,
      name: feature.properties.subdistrict_name_en,
      name_th: feature.properties.subdistrict_name_th,
      district_id: feature.properties.district_code,
      area_sqm: feature.properties.area_sqm,
    },
    geometry: feature.geometry,
  })),
}

/** Bangkok's own outline — a MultiPolygon, not necessarily a single ring, so every helper below walks every polygon rather than assuming one. */
export const bangkokOutline: MultiPolygon = rawBangkok.features[0].geometry

/** Standard ray-casting point-in-polygon test; [lon, lat] order, matching GeoJSON. */
function isPointInRing(point: Position, ring: Position[]): boolean {
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

/** A GeoJSON Polygon's rings: the first is the outer boundary, any further ones are holes to subtract. */
function isPointInPolygon(point: Position, rings: Position[][]): boolean {
  if (rings.length === 0 || !isPointInRing(point, rings[0])) return false
  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(point, rings[i])) return false
  }
  return true
}

export function isPointInMultiPolygon(point: Position, polygons: Position[][][]): boolean {
  return polygons.some((rings) => isPointInPolygon(point, rings))
}

export function isPointInBangkokOutline(point: Position): boolean {
  return isPointInMultiPolygon(point, bangkokOutline.coordinates)
}

/** Bounding box of a MultiPolygon — e.g. for rejection-sampling a point somewhere inside it. */
export function multiPolygonBounds(polygons: Position[][][]): { minLon: number; minLat: number; maxLon: number; maxLat: number } {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const rings of polygons) {
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  return { minLon, minLat, maxLon, maxLat }
}

function boundsCenter(bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number }): Position {
  return [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2]
}

/** Average of every outer-ring vertex (holes excluded) — a cheap stand-in for a true area centroid, close enough for a distance-from-center weighting or a label anchor; always falls inside or very near the shape for the reasonably compact admin polygons here. */
export function multiPolygonCentroid(polygons: Position[][][]): Position {
  let sumLon = 0
  let sumLat = 0
  let count = 0
  for (const rings of polygons) {
    const outer = rings[0] ?? []
    for (const [lon, lat] of outer) {
      sumLon += lon
      sumLat += lat
      count += 1
    }
  }
  if (count === 0) return boundsCenter(multiPolygonBounds(polygons))
  return [sumLon / count, sumLat / count]
}

export const OUTLINE_CENTER: Position = boundsCenter(multiPolygonBounds(bangkokOutline.coordinates))

/** Every boundary position in the Bangkok outline, flattened — enough to compute a fitBounds box from; holes included is harmless since they only add interior points. */
export const bangkokBoundaryPositions: Position[] = bangkokOutline.coordinates.flat(2)

if (import.meta.env.DEV) validateSubDistrictAssignment()

/**
 * Dev-only guard for the rules the rest of this module relies on: every
 * sub-district id is unique and belongs to exactly one district, its code's
 * 4-digit prefix matches that district's code, and the two files' own
 * area_sqm figures are mutually consistent (a district's area equals the
 * sum of its sub-districts' areas, independently supplied by each file).
 */
function validateSubDistrictAssignment(): void {
  const validDistrictIds = new Set(mockDistrictBoundaries.features.map((feature) => feature.properties.id))
  const districtIdsById = new Map<string, Set<string>>()

  for (const feature of mockSubDistrictBoundaries.features) {
    const { id, district_id } = feature.properties
    const districtIds = districtIdsById.get(id)
    if (districtIds) console.error(`[mapBoundaries] duplicate sub-district id: ${id}`)
    const set = districtIds ?? new Set<string>()
    if (district_id) set.add(district_id)
    districtIdsById.set(id, set)

    if (!id.startsWith(district_id)) console.error(`[mapBoundaries] sub-district ${id} code doesn't start with its district code ${district_id}`)
    if (!validDistrictIds.has(district_id)) console.error(`[mapBoundaries] sub-district ${id} references unknown district ${district_id}`)
  }

  for (const [id, districtIds] of districtIdsById) {
    if (districtIds.size !== 1) {
      console.error(`[mapBoundaries] sub-district ${id} maps to ${districtIds.size} districts: ${[...districtIds].join(', ')}`)
    }
  }

  const summedAreaByDistrict = new Map<string, number>()
  for (const feature of mockSubDistrictBoundaries.features) {
    const districtId = feature.properties.district_id
    summedAreaByDistrict.set(districtId, (summedAreaByDistrict.get(districtId) ?? 0) + feature.properties.area_sqm)
  }
  for (const feature of mockDistrictBoundaries.features) {
    const summedArea = summedAreaByDistrict.get(feature.properties.id) ?? 0
    if (Math.abs(summedArea - feature.properties.area_sqm) > feature.properties.area_sqm * 0.001) {
      console.error(`[mapBoundaries] district ${feature.properties.id} area_sqm (${feature.properties.area_sqm}) != sum of its sub-districts (${summedArea})`)
    }
  }
}

export function getSubDistrictFeature(id: string): Feature<MultiPolygon, SubDistrictProperties> | undefined {
  return mockSubDistrictBoundaries.features.find((feature) => feature.properties.id === id)
}

export function getDistrictFeature(id: string): Feature<MultiPolygon, DistrictProperties> | undefined {
  return mockDistrictBoundaries.features.find((feature) => feature.properties.id === id)
}

/** Which sub-district a point falls in — a reverse point→area lookup (e.g. for a raw map click). */
export function findSubDistrictId(point: Position): string {
  const containing = mockSubDistrictBoundaries.features.find((feature) => isPointInMultiPolygon(point, feature.geometry.coordinates))
  if (containing) return containing.properties.id

  // Rare fallback for a point that lands in a gap the simplification left
  // between neighbouring polygons — nearest by centroid.
  let nearestId = mockSubDistrictBoundaries.features[0].properties.id
  let nearestDistSq = Infinity
  for (const feature of mockSubDistrictBoundaries.features) {
    const [centerLon, centerLat] = multiPolygonCentroid(feature.geometry.coordinates)
    const distSq = (centerLon - point[0]) ** 2 + (centerLat - point[1]) ** 2
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq
      nearestId = feature.properties.id
    }
  }
  return nearestId
}

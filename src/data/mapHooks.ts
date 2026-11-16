import type { FeatureCollection, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson'
import { getOpsAnalysis, type OpsAnalysis } from '../mock/opsAnalysis'
import { getNearbySpaces, type NearbySpace } from '../mock/nearbySpaces'
import { mockOpsPoints, type OpsPointProperties } from '../mock/opsPoints'
import type { Year } from '../mock/years'
import { apiGet, type ApiNearbyResponse, type ApiOpsCollection, type ApiOpsDetail, type ApiServiceAreas } from './api/client'
import { isApiMode } from './dataSource'
import { createResourceCache, useResource } from './resource'

// Map data that depends on the year or a selection. Mock mode keeps the
// existing synchronous mock functions; api mode fetches on demand and caches
// per key. Shapes match the mock types, so MapPage handles both the same way.

/** Whole-city bbox (WGS 84) — every Bangkok OPS falls inside it. */
const BANGKOK_BBOX = '100.32,13.48,100.95,13.96'

const EMPTY_POINTS: FeatureCollection<Point, OpsPointProperties> = { type: 'FeatureCollection', features: [] }

function toMultiPolygon(geometry: MultiPolygon | Polygon | null): MultiPolygon | null {
  if (!geometry) return null
  return geometry.type === 'Polygon' ? { type: 'MultiPolygon', coordinates: [geometry.coordinates] } : geometry
}

// The most recently loaded year's markers — shown while the next year loads,
// so switching years never briefly empties the map (which would also drop the
// selected park).
let lastOpsPoints: { year: string; points: FeatureCollection<Point, OpsPointProperties> } | null = null

const opsPointsCache = createResourceCache(async (year) => {
  const collection = await apiGet<ApiOpsCollection>('ops', { year, bbox: BANGKOK_BBOX })
  const points: FeatureCollection<Point, OpsPointProperties> = {
    type: 'FeatureCollection',
    features: collection.features.map((feature) => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id: String(feature.properties.ops_id),
        name: feature.properties.name_en ?? feature.properties.name_th,
        name_th: feature.properties.name_th,
        ops_type: feature.properties.ops_type,
        area_sqm: feature.properties.ops_area_sqm,
        opened_year: feature.properties.opened_year,
        subdistrict_id: feature.properties.subdistrict_id,
      },
    })),
  }
  lastOpsPoints = { year, points }
  return points
})

/**
 * OPS markers for the year (api: opened_year <= year, from the server). `key`
 * changes when the set changes, for remounting Leaflet GeoJSON layers whose
 * `data` only applies at creation.
 */
export function useOpsPoints(year: Year): { points: FeatureCollection<Point, OpsPointProperties>; key: string; loading: boolean } {
  const state = useResource(opsPointsCache, isApiMode ? String(year) : null)
  if (!isApiMode) return { points: mockOpsPoints, key: 'mock', loading: false }
  if (state.status === 'ready') return { points: state.data, key: `api-${year}`, loading: false }
  if (lastOpsPoints) return { points: lastOpsPoints.points, key: `api-${lastOpsPoints.year}`, loading: true }
  return { points: EMPTY_POINTS, key: `api-${year}-${state.status}`, loading: state.status === 'loading' }
}

const opsAnalysisCache = createResourceCache(async (key) => {
  const [opsId, year] = key.split('__')
  const detail = await apiGet<ApiOpsDetail>(`ops/${opsId}`, { year })
  const a = detail.analysis
  const analysis: OpsAnalysis = {
    analysis_id: `${a.analysis_id}-${detail.ops_id}`,
    ops_id: String(detail.ops_id),
    network: a.network ?? ({ type: 'MultiLineString', coordinates: [] } as MultiLineString),
    serviceArea: toMultiPolygon(a.service_area) ?? { type: 'MultiPolygon', coordinates: [] },
    populationCovered: a.population_covered,
    networkLengthM: a.network_length_m ?? 0,
    serviceAreaSqm: a.service_area_sqm ?? 0,
  }
  return analysis
})

/** One OPS's network / service area / population covered for the year. */
export function useOpsAnalysis(opsId: string | undefined, year: Year): OpsAnalysis | undefined {
  const state = useResource(opsAnalysisCache, isApiMode && opsId ? `${opsId}__${year}` : null)
  if (!opsId) return undefined
  if (!isApiMode) return getOpsAnalysis(opsId, year)
  return state.status === 'ready' ? state.data : undefined
}

const serviceAreasCache = createResourceCache(async (year) => {
  const collection = await apiGet<ApiServiceAreas>('service-areas', { year, bbox: BANGKOK_BBOX })
  return new Map(collection.features.map((f) => [String(f.properties.ops_id), toMultiPolygon(f.geometry)!]))
})

/**
 * api mode: every OPS's service area for the year, by OPS id (the map
 * combines the visible ones). null in mock mode or until loaded — mock mode
 * builds its own from getOpsAnalysis.
 */
export function useServiceAreasById(year: Year, enabled: boolean): Map<string, MultiPolygon> | null {
  const state = useResource(serviceAreasCache, isApiMode && enabled ? String(year) : null)
  return isApiMode && enabled && state.status === 'ready' ? state.data : null
}

const nearbyCache = createResourceCache(async (key) => {
  const [area, year] = key.split('__')
  const response = await apiGet<ApiNearbyResponse>('ops/nearby', { area, year })
  const spaces: NearbySpace[] = response.items.map((item) => ({
    id: String(item.ops_id),
    name: item.name_en ?? item.name_th,
    name_th: item.name_th,
    type: item.ops_type,
    distanceM: item.distance_m,
    districtId: item.district_id,
  }))
  return spaces
})

/** OPS near an area (api: within 400 m, open in the year, nearest first). */
export function useNearbySpaces(areaId: string | null, year: Year): { spaces: NearbySpace[]; loading: boolean } {
  const state = useResource(nearbyCache, isApiMode && areaId ? `${areaId}__${year}` : null)
  if (!areaId) return { spaces: [], loading: false }
  if (!isApiMode) return { spaces: getNearbySpaces(areaId), loading: false }
  return { spaces: state.status === 'ready' ? state.data : [], loading: state.status === 'loading' || state.status === 'idle' }
}

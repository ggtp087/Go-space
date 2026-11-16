import type { FeatureCollection, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson'
import type { OpsType } from '../config/opsTypes'
import { apiGet, type ApiNearbyResponse, type ApiOpsCollection, type ApiOpsDetail, type ApiServiceAreas } from './api/client'
import { createResourceCache, useResource, type ResourceState } from './resource'
import type { Year } from './years'

// Map data that depends on the year or a selection, fetched from the API on
// demand and cached per key.

/** One OPS marker (spatial.open_public_spaces, open in the year). */
export type OpsPointProperties = {
  id: string
  name: string
  name_th: string
  ops_type: OpsType
  area_sqm: number
  opened_year: number
  subdistrict_id: string
}

/** One OPS's analysis for a year: network_analysis_results, service_area_results, overlay_results. */
export type OpsAnalysis = {
  analysis_id: string
  ops_id: string
  network: MultiLineString
  serviceArea: MultiPolygon
  /** Per-OPS only (never summed); null while the year's population results are pending. */
  populationCovered: number | null
  networkLengthM: number
  serviceAreaSqm: number
  /** The park's entrances (open_public_space_entrances) — the origins of its network analysis. */
  entrances: FeatureCollection<Point, { entrance_id: number; name: string | null }>
}

/** An OPS near an area, nearest first. */
export type NearbySpace = {
  id: string
  name: string
  name_th: string
  type: OpsType
  distanceM: number
  districtId: string
}

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
 * OPS markers for the year (opened_year <= year, from the server). `key`
 * changes when the set changes, for remounting Leaflet GeoJSON layers whose
 * `data` only applies at creation.
 */
export function useOpsPoints(year: Year): {
  points: FeatureCollection<Point, OpsPointProperties>
  key: string
  loading: boolean
  error: Error | null
  retry: () => void
} {
  const state: ResourceState<FeatureCollection<Point, OpsPointProperties>> = useResource(opsPointsCache, String(year))
  const retry = () => opsPointsCache.ensure(String(year))
  const error = state.status === 'error' ? state.error : null
  if (state.status === 'ready') return { points: state.data, key: `api-${year}`, loading: false, error, retry }
  if (lastOpsPoints) return { points: lastOpsPoints.points, key: `api-${lastOpsPoints.year}`, loading: state.status === 'loading', error, retry }
  return { points: EMPTY_POINTS, key: `api-${year}-${state.status}`, loading: state.status === 'loading', error, retry }
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
    entrances: {
      type: 'FeatureCollection',
      features: detail.entrances.map((e) => ({
        type: 'Feature',
        geometry: e.geometry,
        properties: { entrance_id: e.entrance_id, name: e.name },
      })),
    },
  }
  return analysis
})

/** One OPS's network / service area / population covered for the year. */
export function useOpsAnalysis(opsId: string | undefined, year: Year): OpsAnalysis | undefined {
  const state = useResource(opsAnalysisCache, opsId ? `${opsId}__${year}` : null)
  if (!opsId) return undefined
  return state.status === 'ready' ? state.data : undefined
}

const serviceAreasCache = createResourceCache(async (year) => {
  const collection = await apiGet<ApiServiceAreas>('service-areas', { year, bbox: BANGKOK_BBOX })
  return new Map(collection.features.map((f) => [String(f.properties.ops_id), toMultiPolygon(f.geometry)!]))
})

/** Every OPS's service area for the year, by OPS id (the map combines the visible ones); null until loaded or while the layer is off. */
export function useServiceAreasById(year: Year, enabled: boolean): Map<string, MultiPolygon> | null {
  const state = useResource(serviceAreasCache, enabled ? String(year) : null)
  return enabled && state.status === 'ready' ? state.data : null
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

/** OPS within 400 m of an area, open in the year, nearest first. */
export function useNearbySpaces(areaId: string | null, year: Year): { spaces: NearbySpace[]; loading: boolean; error: boolean } {
  const state = useResource(nearbyCache, areaId ? `${areaId}__${year}` : null)
  if (!areaId) return { spaces: [], loading: false, error: false }
  return {
    spaces: state.status === 'ready' ? state.data : [],
    loading: state.status === 'loading' || state.status === 'idle',
    error: state.status === 'error',
  }
}

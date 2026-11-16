import type { Feature, FeatureCollection, Geometry, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson'
import type { OpsType } from '../../config/opsTypes'

// Response shapes of the read-only API (server/src/routes). snake_case to
// match the database columns; values keep full precision.

export type ApiYear = { year: number; analysis_id: number; population_year: number; status: 'ok' | 'pending' }
export type ApiYearsResponse = { years: ApiYear[]; latest_year_with_results: number | null }

export type ApiResultRow = {
  id: string
  name_en: string
  name_th: string
  parent_id: string | null
  total_area_sqm: number
  ops_area_sqm: number
  share_ops_pct: number
  total_population: number
  population_with_access: number
  access_pct: number
  ops_count: Record<OpsType, number>
}
export type ApiResultsResponse = { year: number; status: 'ok' | 'pending'; level: string; rows: ApiResultRow[] }

export type ApiOpsProperties = {
  ops_id: number
  name_th: string
  name_en: string | null
  ops_type: OpsType
  ops_area_sqm: number
  opened_year: number
  subdistrict_id: string
  district_id: string
}
export type ApiOpsCollection = FeatureCollection<Point, ApiOpsProperties>

export type ApiOpsDetail = ApiOpsProperties & {
  geometry: Point
  polygon: MultiPolygon | Polygon
  entrances: { entrance_id: number; name: string | null; geometry: Point }[]
  analysis: {
    year: number
    analysis_id: number
    network_length_m: number | null
    network: MultiLineString | null
    service_area_sqm: number | null
    service_area: MultiPolygon | Polygon | null
    population_covered: number | null
    population_status: 'ok' | 'pending'
  }
}

/** /api/roads, /api/population-grid, /api/ops-polygons — viewport layers. */
export type ApiViewportCollection<G extends Geometry, P> = FeatureCollection<G, P> & {
  zoom: number
  truncated: boolean
  /** population-grid only: "pending" = no adjusted population for the year (no cells). */
  status?: 'ok' | 'pending'
}

export type ApiServiceAreas = FeatureCollection<MultiPolygon | Polygon, { ops_id: number; ops_type: OpsType; service_area_sqm: number }>

export type ApiNearbyResponse = {
  area: string
  year: number
  items: (ApiOpsProperties & { distance_m: number; inside_area: boolean; geometry: Point })[]
}

export type ApiSearchResponse = {
  q: string
  districts: { id: string; name_th: string; name_en: string | null }[]
  subdistricts: { id: string; name_th: string; name_en: string | null; district_id: string }[]
  ops: (Omit<ApiOpsProperties, 'ops_area_sqm'> & { geometry: Point })[]
}

export type ApiFeature<G extends Point | MultiPolygon | Polygon, P> = Feature<G, P>

export class ApiError extends Error {
  readonly status: number
  /** The server's machine-readable reason (EMAIL_TAKEN, INVALID_CREDENTIALS, …), translated by the caller. */
  readonly code?: string
  /** Per-field validation codes from the server. */
  readonly fields?: Record<string, string>
  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `${response.status} ${response.statusText}`
  let code: string | undefined
  let fields: Record<string, string> | undefined
  try {
    const body = (await response.json()) as { error?: string; code?: string; fields?: Record<string, string> }
    if (body.error) message = body.error
    code = body.code
    fields = body.fields
  } catch {
    // Non-JSON error body — keep the status text.
  }
  return new ApiError(response.status, message, code, fields)
}

/**
 * POST / PATCH a JSON body to /api/<path>. The session is an httpOnly
 * cookie the browser sends on its own (same origin) — no token is ever
 * read or stored by the client.
 */
export async function apiSend<T>(method: 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

/** GET /api/<path> with query params; throws ApiError with the server's message on a non-2xx response. */
export async function apiGet<T>(path: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<T> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const query = search.toString()
  const response = await fetch(`/api/${path}${query ? `?${query}` : ''}`, { signal, credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

/** The signed-in user as returned by /api/auth/me, /login and /account/profile. */
export type ApiUser = {
  user_id: number
  email: string
  first_name_th: string
  last_name_th: string
  first_name_en: string
  last_name_en: string
  department_id: number
  position_id: number
}

export type ApiDepartment = { department_id: number; name_th: string; name_en: string }
export type ApiPosition = { position_id: number; name_th: string; name_en: string }

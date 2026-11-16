/** An error the client caused (bad parameter, unknown id) — sent as JSON with its status, not logged as a server fault. */
export class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message)
}

function single(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw badRequest(`${name} must be given once`)
  return value
}

/** A required positive integer query/path parameter. */
export function parseInteger(value: unknown, name: string): number {
  const raw = single(value, name)
  if (raw === undefined || raw === '') throw badRequest(`${name} is required`)
  if (!/^\d{1,9}$/.test(raw)) throw badRequest(`${name} must be a positive integer`)
  return Number(raw)
}

export function parseEnum<T extends string>(value: unknown, name: string, allowed: readonly T[], fallback?: T): T {
  const raw = single(value, name)
  if (raw === undefined || raw === '') {
    if (fallback !== undefined) return fallback
    throw badRequest(`${name} is required (one of: ${allowed.join(', ')})`)
  }
  if (!(allowed as readonly string[]).includes(raw)) throw badRequest(`${name} must be one of: ${allowed.join(', ')}`)
  return raw as T
}

export type Bbox = [minLon: number, minLat: number, maxLon: number, maxLat: number]

/** Optional bbox "minLon,minLat,maxLon,maxLat" in WGS 84 degrees. */
export function parseBbox(value: unknown): Bbox | undefined {
  const raw = single(value, 'bbox')
  if (raw === undefined || raw === '') return undefined
  const parts = raw.split(',')
  if (parts.length !== 4) throw badRequest('bbox must be 4 numbers: minLon,minLat,maxLon,maxLat')
  const numbers = parts.map((p) => Number(p.trim()))
  if (numbers.some((n, i) => parts[i].trim() === '' || !Number.isFinite(n))) throw badRequest('bbox must be 4 numbers: minLon,minLat,maxLon,maxLat')
  const [minLon, minLat, maxLon, maxLat] = numbers
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) throw badRequest('bbox must be WGS 84 longitude/latitude degrees')
  if (minLon >= maxLon || minLat >= maxLat) throw badRequest('bbox min values must be smaller than max values')
  return [minLon, minLat, maxLon, maxLat]
}

/** An area id: "bangkok", a 4-digit district code, or a 6-digit sub-district code. */
export function parseAreaCode(value: unknown, name = 'area'): string {
  const raw = single(value, name)
  if (raw === undefined || raw === '') throw badRequest(`${name} is required`)
  if (raw !== 'bangkok' && !/^\d{4}(\d{2})?$/.test(raw)) throw badRequest(`${name} must be "bangkok", a district code or a sub-district code`)
  return raw
}

export function parseSearchQuery(value: unknown): string {
  const raw = single(value, 'q')?.trim() ?? ''
  if (raw.length < 1) throw badRequest('q is required')
  if (raw.length > 100) throw badRequest('q must be at most 100 characters')
  return raw
}

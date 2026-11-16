import { useEffect, useState } from 'react'
import { apiGet } from './api/client'

// Data for the zoomed-in map layers (roads, population grid, OPS polygons),
// requested for the current viewport. The map reports its viewport already
// debounced (MapPage); here each request
// - snaps the bbox outward to a zoom-dependent grid, so small pans reuse the
//   same request and cache entry instead of refetching;
// - is cached per (endpoint, params, zoom, snapped bbox), most-recent first;
// - is aborted (AbortController) as soon as the viewport moves on.

export type Viewport = { bbox: [number, number, number, number]; zoom: number }

const CACHE_LIMIT = 40
const cache = new Map<string, unknown>()

function remember(key: string, value: unknown) {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
}

/** Grid step for snapping (degrees): about half a screen width at the zoom, so the fetched area includes a margin around the view. */
function snapStep(zoom: number): number {
  return 0.02 / 2 ** (zoom - 14)
}

function snapBbox([w, s, e, n]: Viewport['bbox'], zoom: number): Viewport['bbox'] {
  const step = snapStep(zoom)
  const down = (v: number) => Math.floor(v / step) * step
  const up = (v: number) => Math.ceil(v / step) * step
  return [down(w), down(s), up(e), up(n)].map((v) => Number(v.toFixed(5))) as Viewport['bbox']
}

export type ViewportLayerState<T> = { data: T | null; loading: boolean; error: boolean }

/**
 * Fetches `path` for the viewport when `enabled` (null viewport = not known
 * yet). While a new viewport loads, the last data for the same layer stays
 * on screen. Returns the data plus a `key` that changes with the data, for
 * remounting Leaflet GeoJSON layers (their `data` only applies at creation).
 */
export function useViewportLayer<T>(
  path: string,
  params: Record<string, string | number>,
  viewport: Viewport | null,
  enabled: boolean,
): ViewportLayerState<T> & { key: string | null } {
  const paramKey = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const snapped = viewport ? snapBbox(viewport.bbox, viewport.zoom) : null
  const key = enabled && viewport && snapped ? `${path}?${paramKey}&zoom=${viewport.zoom}&bbox=${snapped.join(',')}` : null

  // Bumped when a request settles, so the cached result is read on the next render.
  const [, setVersion] = useState(0)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  // The last key that produced data for this layer (shown while the next loads).
  const [shownKey, setShownKey] = useState<string | null>(null)

  useEffect(() => {
    if (!key || !viewport || !snapped || cache.has(key)) return
    const controller = new AbortController()
    apiGet<T>(path, { ...params, zoom: viewport.zoom, bbox: snapped.join(',') }, controller.signal).then(
      (data) => {
        remember(key, data)
        setShownKey(key)
        setVersion((v) => v + 1)
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        console.error('[api]', key, error)
        setFailedKey(key)
      },
    )
    return () => controller.abort()
    // `key` captures path, params, zoom and the snapped bbox.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!key) return { data: null, loading: false, error: false, key: null }
  if (cache.has(key)) return { data: cache.get(key) as T, loading: false, error: false, key }
  // Only the same layer with the same params (e.g. the same year) — never
  // another year's cells while the new year loads.
  const sameLayer = shownKey !== null && shownKey.startsWith(`${path}?${paramKey}&zoom=`)
  const previous = sameLayer && cache.has(shownKey) ? (cache.get(shownKey) as T) : null
  return { data: previous, loading: failedKey !== key, error: failedKey === key, key: previous ? shownKey : null }
}

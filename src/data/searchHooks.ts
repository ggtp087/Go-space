import { useEffect, useState } from 'react'
import { apiGet, type ApiSearchResponse } from './api/client'
import type { NearbySpace } from './mapHooks'
import { createResourceCache, useResource } from './resource'

const SEARCH_DEBOUNCE_MS = 250
const MAX_PARKS = 5

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

const searchCache = createResourceCache(async (q) => {
  const response = await apiGet<ApiSearchResponse>('search', { q })
  const parks: NearbySpace[] = response.ops.map((ops) => ({
    id: String(ops.ops_id),
    name: ops.name_en ?? ops.name_th,
    name_th: ops.name_th,
    type: ops.ops_type,
    distanceM: 0,
    districtId: ops.district_id,
  }))
  return parks
})

/** Parks (OPS) matching the header search — the server's parameterized ILIKE over Thai and English names (debounced). */
export function useParkSearch(query: string): NearbySpace[] {
  const q = query.trim()
  const debounced = useDebouncedValue(q, SEARCH_DEBOUNCE_MS)
  const state = useResource(searchCache, debounced ? debounced.toLowerCase() : null)
  if (!q) return []
  return state.status === 'ready' ? state.data.slice(0, MAX_PARKS) : []
}

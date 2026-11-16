import { useEffect, useSyncExternalStore } from 'react'

export type ResourceState<T> = { status: 'idle' | 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: Error }

const IDLE = { status: 'idle' } as const

/**
 * A keyed request cache for API data that's fetched on demand (OPS markers per
 * year, one OPS's analysis, nearby spaces…). Each key is fetched once and
 * kept; components read it with useResource, which re-renders them when the
 * request settles.
 */
export function createResourceCache<T>(fetcher: (key: string) => Promise<T>) {
  const entries = new Map<string, ResourceState<T>>()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get(key: string): ResourceState<T> {
      return entries.get(key) ?? IDLE
    },
    ensure(key: string) {
      const current = entries.get(key)
      if (current && current.status !== 'error') return
      entries.set(key, { status: 'loading' })
      notify()
      fetcher(key).then(
        (data) => {
          entries.set(key, { status: 'ready', data })
          notify()
        },
        (error: unknown) => {
          console.error('[api]', key, error)
          entries.set(key, { status: 'error', error: error instanceof Error ? error : new Error(String(error)) })
          notify()
        },
      )
    },
  }
}

export type ResourceCache<T> = ReturnType<typeof createResourceCache<T>>

/** The cached state for `key` (null = nothing requested), starting the request if needed. */
export function useResource<T>(cache: ResourceCache<T>, key: string | null): ResourceState<T> {
  useEffect(() => {
    if (key !== null) cache.ensure(key)
  }, [cache, key])
  return useSyncExternalStore(cache.subscribe, () => (key === null ? IDLE : cache.get(key)))
}

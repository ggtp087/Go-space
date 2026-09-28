import { createContext, useContext } from 'react'
import type { AreaLevel } from '../mock/areas'

export type AreaContextValue = {
  level: AreaLevel
  setLevel: (level: AreaLevel) => void
  /** A concrete district id, or 'all' (Dashboard's "All districts"). */
  districtId: string
  setDistrictId: (id: string) => void
  /** A concrete sub-district id, or 'all' ("All sub-districts"). */
  subDistrictId: string
  setSubDistrictId: (id: string) => void
}

export const AreaContext = createContext<AreaContextValue | null>(null)

/** The selected admin level / district / sub-district, shared by Map, Dashboard, and Compare. */
export function useArea() {
  const ctx = useContext(AreaContext)
  if (!ctx) throw new Error('useArea must be used within an AreaProvider')
  return ctx
}

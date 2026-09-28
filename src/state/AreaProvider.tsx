import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AreaContext, type AreaContextValue } from './AreaContext'
import type { AreaLevel } from '../mock/areas'
import { getSubDistrictParentId } from '../mock/subdistricts'

export function AreaProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<AreaLevel>('district')
  const [districtId, setDistrictIdState] = useState('district-d')
  const [subDistrictId, setSubDistrictIdState] = useState('all')

  // Picking a district clears any previously selected sub-district from a
  // different district, so the pair never points at mismatched areas.
  const setDistrictId = useCallback((id: string) => {
    setDistrictIdState(id)
    setSubDistrictIdState('all')
  }, [])

  // Picking a concrete sub-district also updates districtId to its parent,
  // so Map's scoped dropdown and any breadcrumb stay consistent everywhere.
  const setSubDistrictId = useCallback((id: string) => {
    setSubDistrictIdState(id)
    if (id !== 'all') {
      const parentId = getSubDistrictParentId(id)
      if (parentId) setDistrictIdState(parentId)
    }
  }, [])

  const value = useMemo<AreaContextValue>(
    () => ({ level, setLevel, districtId, setDistrictId, subDistrictId, setSubDistrictId }),
    [level, districtId, setDistrictId, subDistrictId, setSubDistrictId],
  )

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>
}

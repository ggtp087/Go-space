import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AreaContext, type AreaContextValue } from './AreaContext'
import type { AreaLevel } from '../mock/areas'
import { getSubDistrictParentId } from '../mock/subdistricts'
import { getSubDistrictFeature } from '../mock/mapBoundaries'

// Dashboard/Compare's sub-districts (district-a-1, ...) and the Map page's
// geo sub-districts (geo-subdistrict-1, ...) are two different id
// namespaces sharing this same context — try the Dashboard lookup first,
// then the geo one, so whichever namespace a given id belongs to resolves.
function resolveParentDistrictId(subDistrictId: string): string | undefined {
  return getSubDistrictParentId(subDistrictId) ?? getSubDistrictFeature(subDistrictId)?.properties.district_id
}

export function AreaProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<AreaLevel>('district')
  // 'all' ("All districts" / whole Bangkok) is the shared default.
  const [districtId, setDistrictIdState] = useState('all')
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
      const parentId = resolveParentDistrictId(id)
      if (parentId) setDistrictIdState(parentId)
    }
  }, [])

  const value = useMemo<AreaContextValue>(
    () => ({ level, setLevel, districtId, setDistrictId, subDistrictId, setSubDistrictId }),
    [level, districtId, setDistrictId, subDistrictId, setSubDistrictId],
  )

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>
}

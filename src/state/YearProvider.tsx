import { useMemo, useState, type ReactNode } from 'react'
import { YearContext, type YearContextValue } from './YearContext'
import { availableYears, type Year } from '../mock/years'
import { getInitialYear } from '../data/yearStatus'

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<Year>(getInitialYear)
  const value = useMemo<YearContextValue>(() => ({ year, setYear, years: availableYears }), [year])
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>
}

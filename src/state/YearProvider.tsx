import { useMemo, useState, type ReactNode } from 'react'
import { YearContext, type YearContextValue } from './YearContext'
import { availableYears, defaultYear, type Year } from '../mock/years'

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<Year>(defaultYear)
  const value = useMemo<YearContextValue>(() => ({ year, setYear, years: availableYears }), [year])
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>
}

import { useMemo, useState, type ReactNode } from 'react'
import { YearContext, type YearContextValue } from './YearContext'
import type { Year } from '../data/years'
import { getAvailableYears } from '../data/api/store'
import { getInitialYear } from '../data/yearStatus'

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<Year>(getInitialYear)
  // The analysis years from /api/years (loaded before the app renders).
  const value = useMemo<YearContextValue>(() => ({ year, setYear, years: getAvailableYears() }), [year])
  return <YearContext.Provider value={value}>{children}</YearContext.Provider>
}

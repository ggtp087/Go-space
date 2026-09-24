import { createContext, useContext } from 'react'
import type { Year } from '../mock/years'

export type YearContextValue = {
  year: Year
  setYear: (year: Year) => void
  years: readonly Year[]
}

export const YearContext = createContext<YearContextValue | null>(null)

/** The analysis year selected globally, shared by Map, Dashboard, and Compare. */
export function useYear() {
  const ctx = useContext(YearContext)
  if (!ctx) throw new Error('useYear must be used within a YearProvider')
  return ctx
}

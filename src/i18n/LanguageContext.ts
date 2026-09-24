import { createContext, useContext } from 'react'
import type { Strings } from './strings'

export type Language = 'en' | 'th'

export type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: Strings
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}

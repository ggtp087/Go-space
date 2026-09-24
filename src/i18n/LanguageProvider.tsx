import { useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, type Language, type LanguageContextValue } from './LanguageContext'
import { en, th, type Strings } from './strings'

function resolveStrings(language: Language): Strings {
  if (language === 'en') return en
  // th is filled in incrementally; any key it doesn't have yet falls back to en.
  return {
    brand: { ...en.brand, ...th.brand },
    nav: { ...en.nav, ...th.nav },
    search: { ...en.search, ...th.search },
    lang: { ...en.lang, ...th.lang },
    user: { ...en.user, ...th.user },
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: resolveStrings(language) }),
    [language],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

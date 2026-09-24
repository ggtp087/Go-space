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
    pages: { ...en.pages, ...th.pages },
    map: { ...en.map, ...th.map },
    adminLevel: { ...en.adminLevel, ...th.adminLevel },
    filters: { ...en.filters, ...th.filters },
    common: { ...en.common, ...th.common },
    dashboard: {
      ...en.dashboard,
      ...th.dashboard,
      columns: { ...en.dashboard.columns, ...th.dashboard?.columns },
    },
    compare: { ...en.compare, ...th.compare },
    auth: {
      login: { ...en.auth.login, ...th.auth?.login },
      register: { ...en.auth.register, ...th.auth?.register },
      resetPassword: { ...en.auth.resetPassword, ...th.auth?.resetPassword },
    },
    account: {
      ...en.account,
      ...th.account,
      tabs: { ...en.account.tabs, ...th.account?.tabs },
      profileCard: { ...en.account.profileCard, ...th.account?.profileCard },
      securityCard: { ...en.account.securityCard, ...th.account?.securityCard },
    },
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

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, type Language, type LanguageContextValue } from './LanguageContext'
import { en, th, type Strings } from './strings'

const STORAGE_KEY = 'go-space:language'

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'en' || stored === 'th' ? stored : null
  } catch {
    return null
  }
}

function writeStoredLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Storage unavailable (private mode, quota, disabled) — the choice just
    // won't survive a reload this session, nothing else depends on it.
  }
}

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
    map: {
      ...en.map,
      ...th.map,
      opsTypes: { ...en.map.opsTypes, ...th.map?.opsTypes },
      layers: { ...en.map.layers, ...th.map?.layers },
      basemapLabels: { ...en.map.basemapLabels, ...th.map?.basemapLabels },
      opsCard: { ...en.map.opsCard, ...th.map?.opsCard },
    },
    adminLevel: { ...en.adminLevel, ...th.adminLevel },
    filters: { ...en.filters, ...th.filters },
    common: { ...en.common, ...th.common },
    dashboard: {
      ...en.dashboard,
      ...th.dashboard,
      columns: { ...en.dashboard.columns, ...th.dashboard?.columns },
      kpi: { ...en.dashboard.kpi, ...th.dashboard?.kpi },
      trend: { ...en.dashboard.trend, ...th.dashboard?.trend },
      sections: { ...en.dashboard.sections, ...th.dashboard?.sections },
      charts: { ...en.dashboard.charts, ...th.dashboard?.charts },
      controlBar: { ...en.dashboard.controlBar, ...th.dashboard?.controlBar },
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
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage() ?? 'en')

  function setLanguage(next: Language) {
    setLanguageState(next)
    writeStoredLanguage(next)
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: resolveStrings(language) }),
    [language],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

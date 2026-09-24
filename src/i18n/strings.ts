// Single source of UI copy. Every user-facing string in the app should be
// read from here (via `en`, and later `th`) rather than hard-coded in
// components, so a Thai translation can be dropped in without touching JSX.
export const en = {
  brand: {
    word: 'GO SPAce',
    sub: 'Green & Open Space Accessibility',
    title: 'Measuring access to green & open space, district by district.',
    text: 'A GIS platform for the Department of City Planning and Urban Development, Bangkok Metropolitan Administration — bringing the map and the numbers behind SDG Indicator 11.7.1 into one view.',
    badgeIndicator: 'SDG Indicator 11.7.1',
    badgeCoverage: '50 districts · 1,600+ sub-districts',
    footLine1: 'Department of City Planning and Urban Development',
    footLine2: 'Bangkok Metropolitan Administration (BMA)',
  },
  nav: {
    map: 'Map',
    dashboard: 'Dashboard',
    compare: 'Compare',
  },
  search: {
    placeholder: 'Search parks, districts, sub-districts…',
  },
  lang: {
    en: 'EN',
    th: 'TH',
  },
  user: {
    accountSettings: 'Account settings',
    logOut: 'Log out',
  },
} as const

export type Strings = typeof en

// Thai copy lands here once translation work starts; components should keep
// reading through the language context rather than importing `en` directly.
export const th: Partial<Strings> = {}

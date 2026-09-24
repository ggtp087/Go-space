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
    signOut: 'Sign out',
  },
  pages: {
    accountSettingsTitle: 'Account settings',
  },
  map: {
    legendTitle: 'Accessibility to public green & open space',
    legendNote: 'Within 400 m walking distance (street network)',
    filtersTitle: 'Layers & Filters',
    mapPlaceholder: 'Map placeholder',
  },
  adminLevel: {
    district: 'District',
    subDistrict: 'Sub-district',
  },
  filters: {
    year: 'Year',
  },
  dashboard: {
    analysisYear: 'Analysis year',
    trendTitle: 'Accessibility trend by year',
    trendComingSoon: 'Trend chart coming soon — accessibility % by year',
  },
  compare: {
    title: 'Compare districts',
    subtitle: 'Select 2–3 areas to compare accessibility and SDG 11.7.1 indicators side by side',
    modeDistricts: 'Compare districts',
    modeYears: 'Compare years',
    districtLabel: 'District',
    yearALabel: 'Year A',
    yearBLabel: 'Year B',
    addDistrict: 'Add district (up to 3)',
  },
  auth: {
    login: {
      title: 'Sign in',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      registerHere: 'Register here',
    },
    register: {
      title: 'Create your account',
      haveAccount: 'Have an account?',
      signIn: 'Sign in',
    },
    resetPassword: {
      title: 'Reset your password',
      backToSignIn: 'Back to sign in',
    },
  },
} as const

export type Strings = typeof en

// Thai copy lands here once translation work starts; components should keep
// reading through the language context rather than importing `en` directly.
export const th: Partial<Strings> = {}

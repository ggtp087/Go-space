import type { PersonNames } from '../i18n/personName'

// Placeholder signed-in user shown in the navbar and account settings.
// Fields mirror users + user_profiles columns (no auth yet, so email lives
// here too); the four name fields use the user_profiles column names.
// Anything else — display name, initials — is derived from these at the
// point of use (i18n/personName.ts) rather than stored, so it can never
// drift out of sync.
export type CurrentUser = PersonNames & {
  email: string
  /** departments.id (mock/organization.ts) — the name shown follows the UI language. */
  department: string
  /** positions.id (mock/organization.ts). */
  position: string
}

export const currentUser: CurrentUser = {
  email: 'nisa.p@bma.go.th',
  first_name_th: 'นิสา',
  last_name_th: 'ประเสริฐ',
  first_name_en: 'Nisa',
  last_name_en: 'Prasert',
  department: 'city-planning',
  position: 'urban-planner',
}

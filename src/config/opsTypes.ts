// Canonical list of open-space point types — mirrors the eventual
// open_public_space_types lookup table, so this is the one place the set of
// valid types and their ordering live. Display labels (EN/TH) go through
// the i18n strings (t.map.opsTypes) instead of being hard-coded here.
export const opsTypeValues = ['open_space', 'public_park', 'park_15min', 'sports_ground'] as const
export type OpsType = (typeof opsTypeValues)[number]

// The filter chips add an "all" sentinel on top of the real type values.
export const opsTypeFilterValues = ['all', ...opsTypeValues] as const
export type OpsTypeFilter = (typeof opsTypeFilterValues)[number]

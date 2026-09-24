import type { Year } from './years'

export type DistrictRow = {
  id: string
  year: Year
  name: string
  population: number
  accessibilityPct: number
  openSpaces: number
  opsSharePct: number
}

/** Color for a given accessibility percentage, on the 5-step scale. */
export function accessibilityColor(pct: number): string {
  if (pct >= 80) return '#2A7A54'
  if (pct >= 65) return '#7FB88F'
  if (pct >= 50) return '#D8D3A0'
  if (pct >= 30) return '#E4B064'
  return '#D9822B'
}

type DistrictSeed = Omit<DistrictRow, 'year'>

// Generic placeholder names — real Bangkok districts/data land later.
const districtSeeds2026: DistrictSeed[] = [
  { id: 'district-a', name: 'District A', population: 62000, accessibilityPct: 86, openSpaces: 9, opsSharePct: 14.8 },
  { id: 'district-b', name: 'District B', population: 45000, accessibilityPct: 79, openSpaces: 6, opsSharePct: 11.9 },
  { id: 'district-c', name: 'District C', population: 79000, accessibilityPct: 76, openSpaces: 7, opsSharePct: 10.4 },
  { id: 'district-d', name: 'District D', population: 158000, accessibilityPct: 74, openSpaces: 8, opsSharePct: 13.2 },
  { id: 'district-e', name: 'District E', population: 84000, accessibilityPct: 71, openSpaces: 5, opsSharePct: 9.1 },
  { id: 'district-f', name: 'District F', population: 96000, accessibilityPct: 61, openSpaces: 6, opsSharePct: 9.8 },
  { id: 'district-g', name: 'District G', population: 146000, accessibilityPct: 49, openSpaces: 4, opsSharePct: 6.5 },
  { id: 'district-h', name: 'District H', population: 154000, accessibilityPct: 25, openSpaces: 2, opsSharePct: 3.4 },
  { id: 'district-i', name: 'District I', population: 141000, accessibilityPct: 22, openSpaces: 2, opsSharePct: 3.1 },
  { id: 'district-j', name: 'District J', population: 172000, accessibilityPct: 12, openSpaces: 1, opsSharePct: 2.1 },
]

/** 2024 was an earlier sample year — slightly less coverage than 2026 for every district. */
function seedFor2024(seed: DistrictSeed): DistrictSeed {
  return {
    ...seed,
    accessibilityPct: Math.max(0, seed.accessibilityPct - 5),
    openSpaces: Math.max(0, seed.openSpaces - 1),
    opsSharePct: Math.round(seed.opsSharePct * 0.85 * 10) / 10,
  }
}

export const sampleDistrictRows: DistrictRow[] = [
  ...districtSeeds2026.map((seed) => ({ ...seed, year: 2026 as Year })),
  ...districtSeeds2026.map((seed) => ({ ...seedFor2024(seed), year: 2024 as Year })),
]

export function getDistrictRowsForYear(year: Year): DistrictRow[] {
  return sampleDistrictRows.filter((row) => row.year === year)
}

export function getDistrictRow(id: string, year: Year): DistrictRow | undefined {
  return sampleDistrictRows.find((row) => row.id === id && row.year === year)
}

/** Residents covered vs. not covered by a 400 m service area — always sums to population. */
export function getCoverage(row: DistrictRow): { covered: number; notCovered: number } {
  const covered = Math.round((row.population * row.accessibilityPct) / 100)
  return { covered, notCovered: row.population - covered }
}

/**
 * SDG 11.7.1 area-based indicators. Built-up area open for public use is kept
 * larger than the open space share by construction, per the site's data rules.
 */
export function getAreaIndicators(row: DistrictRow): { openSpaceSharePct: number; streetsPct: number; builtUpOpenPct: number } {
  const streetsPct = Math.round(row.opsSharePct * 1.15 * 10) / 10
  const builtUpOpenPct = Math.round(row.opsSharePct * 1.4 * 10) / 10
  return { openSpaceSharePct: row.opsSharePct, streetsPct, builtUpOpenPct }
}

export type AccessibilityBracket = {
  color: string
  label: string
  count: number
}

const ACCESSIBILITY_BANDS = [
  { min: 80, max: 100, color: '#2A7A54', label: '80–100%' },
  { min: 65, max: 79, color: '#7FB88F', label: '65–79%' },
  { min: 50, max: 64, color: '#D8D3A0', label: '50–64%' },
  { min: 30, max: 49, color: '#E4B064', label: '30–49%' },
  { min: 0, max: 29, color: '#D9822B', label: '0–29%' },
]

/** How many of the given rows fall into each step of the 5-step accessibility scale. */
export function getAccessibilityBrackets(rows: DistrictRow[]): AccessibilityBracket[] {
  return ACCESSIBILITY_BANDS.map((band) => ({
    color: band.color,
    label: band.label,
    count: rows.filter((row) => row.accessibilityPct >= band.min && row.accessibilityPct <= band.max).length,
  }))
}

export type ComparisonDistrict = {
  id: string
  name: string
  color: string
}

// District A, D, J — spans the accessibility range (highest/mid/lowest) for a useful demo.
export const sampleComparisonDistricts: ComparisonDistrict[] = [
  { id: 'district-a', name: 'District A', color: '#1B4332' },
  { id: 'district-d', name: 'District D', color: '#3F8F63' },
  { id: 'district-j', name: 'District J', color: '#C2660F' },
]

export const sampleOpenSpaceTypes = ['All types', 'Parks', 'Urban forests', 'Playgrounds', 'Plazas', 'Sports fields']

export const sampleDistrictOptions = districtSeeds2026.map((seed) => ({ value: seed.id, label: seed.name }))

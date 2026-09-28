import { applyGaps, generateYearSeries, type AreaRow, type AreaSeed, type Gap } from './areas'

export type { AreaRow } from './areas'
export {
  accessibilityColor,
  getAccessibilityBrackets,
  getAreaIndicators,
  getCoverage,
  type AccessibilityBracket,
} from './areas'

export type ComparisonArea = {
  id: string
  name: string
  color: string
  level: 'district' | 'sub-district'
}

// Generic placeholder names — real Bangkok districts/data land later.
// Alternating trend so the sample data shows both improving and flat areas.
export const districtSeeds: AreaSeed[] = [
  { id: 'district-a', level: 'district', parentId: null, name: 'District A', population: 62000, accessibilityPct: 86, openSpaces: 9, opsSharePct: 14.8, trend: 'improving' },
  { id: 'district-b', level: 'district', parentId: null, name: 'District B', population: 45000, accessibilityPct: 79, openSpaces: 6, opsSharePct: 11.9, trend: 'flat' },
  { id: 'district-c', level: 'district', parentId: null, name: 'District C', population: 79000, accessibilityPct: 76, openSpaces: 7, opsSharePct: 10.4, trend: 'improving' },
  { id: 'district-d', level: 'district', parentId: null, name: 'District D', population: 158000, accessibilityPct: 74, openSpaces: 8, opsSharePct: 13.2, trend: 'flat' },
  { id: 'district-e', level: 'district', parentId: null, name: 'District E', population: 84000, accessibilityPct: 71, openSpaces: 5, opsSharePct: 9.1, trend: 'improving' },
  { id: 'district-f', level: 'district', parentId: null, name: 'District F', population: 96000, accessibilityPct: 61, openSpaces: 6, opsSharePct: 9.8, trend: 'flat' },
  { id: 'district-g', level: 'district', parentId: null, name: 'District G', population: 146000, accessibilityPct: 49, openSpaces: 4, opsSharePct: 6.5, trend: 'improving' },
  { id: 'district-h', level: 'district', parentId: null, name: 'District H', population: 154000, accessibilityPct: 25, openSpaces: 2, opsSharePct: 3.4, trend: 'flat' },
  { id: 'district-i', level: 'district', parentId: null, name: 'District I', population: 141000, accessibilityPct: 22, openSpaces: 2, opsSharePct: 3.1, trend: 'improving' },
  { id: 'district-j', level: 'district', parentId: null, name: 'District J', population: 172000, accessibilityPct: 12, openSpaces: 1, opsSharePct: 2.1, trend: 'flat' },
]

// A couple of districts are missing 1–2 years, to exercise the "no data" state.
const DISTRICT_GAPS: Gap[] = [
  { id: 'district-g', years: [2017] },
  { id: 'district-i', years: [2017, 2018] },
]

export const allDistrictRows: AreaRow[] = applyGaps(
  districtSeeds.flatMap((seed) => generateYearSeries(seed)),
  DISTRICT_GAPS,
)

export function getDistrictOptions(): { value: string; label: string }[] {
  return districtSeeds.map((seed) => ({ value: seed.id, label: seed.name }))
}

// District A, D, J — spans the accessibility range (highest/mid/lowest) for a useful demo.
export const defaultComparisonAreas: ComparisonArea[] = [
  { id: 'district-a', name: 'District A', color: '#1B4332', level: 'district' },
  { id: 'district-d', name: 'District D', color: '#3F8F63', level: 'district' },
  { id: 'district-j', name: 'District J', color: '#C2660F', level: 'district' },
]

export const sampleOpenSpaceTypes = ['All types', 'Parks', 'Urban forests', 'Playgrounds', 'Plazas', 'Sports fields']

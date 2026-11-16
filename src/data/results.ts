import { comparisonPalette } from '../config/mapStyle'
import type { OpsType } from '../config/opsTypes'
import { opsTypeValues } from '../config/opsTypes'
import type { Language } from '../i18n/LanguageContext'
import { localizedName } from '../i18n/localizedName'
import { getApiResult, getAvailableYears, getLatestYearWithResults } from './api/store'
import { districtBoundaries, subDistrictBoundaries } from './boundaries'
import type { Year } from './years'

// The area results for Map, Dashboard, and Comparison — read from the API
// (loaded once at startup, data/api/store.ts). Sub-district rows are
// spatial.assessment_results; district and Bangkok rows are the server's SQL
// sums of raw sub-district values, recomputed into percentages (never an
// average of percentages). Nothing here invents a number: a year without
// results (pending registry data) simply has no row.

export type AreaLevel = 'district' | 'sub-district'

export const BANGKOK_AREA_ID = 'bangkok'

const BANGKOK_NAME_EN = 'Bangkok'
const BANGKOK_NAME_TH = 'กรุงเทพมหานคร'

/** One area's result for a year — assessment_results' fields (summed for district/Bangkok) plus the OPS count by type. Full precision; round only for display. */
export type RolledUpResult = {
  total_area_sqm: number
  ops_area_sqm: number
  share_ops_pct: number
  total_population: number
  population_with_access: number
  access_pct: number
  /** OPS open in the year (opened_year <= year), counted in their primary_subdistrict_id. */
  ops_count: Record<OpsType, number>
}

export type MetricKey = 'access_pct' | 'share_ops_pct'

/** A result plus display metadata, for table/list UI. */
export type AreaRow = RolledUpResult & {
  id: string
  name: string
  level: AreaLevel
  parentId: string | null
  year: Year
}

export type ComparisonArea = { id: string; name: string; color: string; level: AreaLevel }

export function totalOpsCount(counts: Record<OpsType, number>): number {
  return opsTypeValues.reduce((sum, type) => sum + counts[type], 0)
}

/** A sub-district's, district's, or Bangkok's result for the year; undefined for a pending year (or an unknown id). */
export function getAssessmentResult(areaId: string, year: Year): RolledUpResult | undefined {
  return getApiResult(areaId, year)
}

// --- Metadata / options (from the bundled boundaries, which match the DB) ----

type AreaMeta = { id: string; name: string; level: AreaLevel; parentId: string | null; parentName: string | null }

const districtById = new Map(districtBoundaries.features.map((feature) => [feature.properties.id, feature.properties]))
const subDistrictById = new Map(subDistrictBoundaries.features.map((feature) => [feature.properties.id, feature.properties]))

const subDistrictIdsByDistrict = new Map<string, string[]>()
for (const feature of subDistrictBoundaries.features) {
  const list = subDistrictIdsByDistrict.get(feature.properties.district_id) ?? []
  list.push(feature.properties.id)
  subDistrictIdsByDistrict.set(feature.properties.district_id, list)
}

export function getAreaMeta(id: string, language: Language): AreaMeta | undefined {
  if (id === BANGKOK_AREA_ID) {
    return { id, name: localizedName(BANGKOK_NAME_EN, BANGKOK_NAME_TH, language), level: 'district', parentId: null, parentName: null }
  }
  const district = districtById.get(id)
  if (district) {
    return { id, name: localizedName(district.name, district.name_th, language), level: 'district', parentId: null, parentName: null }
  }
  const subDistrict = subDistrictById.get(id)
  if (subDistrict) {
    const parent = districtById.get(subDistrict.district_id)
    return {
      id,
      name: localizedName(subDistrict.name, subDistrict.name_th, language),
      level: 'sub-district',
      parentId: subDistrict.district_id,
      parentName: parent ? localizedName(parent.name, parent.name_th, language) : null,
    }
  }
  return undefined
}

export function getAreaRow(id: string, year: Year, language: Language): AreaRow | undefined {
  const meta = getAreaMeta(id, language)
  const stats = getAssessmentResult(id, year)
  if (!meta || !stats) return undefined
  return { ...stats, id: meta.id, name: meta.name, level: meta.level, parentId: meta.parentId, year }
}

export function getAreaRowsForYear(level: AreaLevel, year: Year, language: Language): AreaRow[] {
  const ids = level === 'district' ? districtBoundaries.features.map((feature) => feature.properties.id) : [...subDistrictById.keys()]
  return ids.map((id) => getAreaRow(id, year, language)).filter((row): row is AreaRow => row !== undefined)
}

/** The area is a known id (Bangkok, a district or a sub-district) — independent of the year. */
export function areaHasAnyData(id: string): boolean {
  return id === BANGKOK_AREA_ID || districtById.has(id) || subDistrictById.has(id)
}

/** All districts, or (for one district) just its own sub-districts — the one scoped list the Dashboard's choropleth, brackets, ranking, and table all share. */
export function getChildAreaRows(districtId: string, year: Year, language: Language): AreaRow[] {
  if (districtId === 'all') return getAreaRowsForYear('district', year, language)
  const subDistrictIds = subDistrictIdsByDistrict.get(districtId) ?? []
  return subDistrictIds.map((id) => getAreaRow(id, year, language)).filter((row): row is AreaRow => row !== undefined)
}

export function getFirstAreaId(level: AreaLevel): string {
  return level === 'district' ? districtBoundaries.features[0].properties.id : subDistrictBoundaries.features[0].properties.id
}

export function getDistrictOptions(language: Language): { value: string; label: string }[] {
  return districtBoundaries.features.map((feature) => ({
    value: feature.properties.id,
    label: localizedName(feature.properties.name, feature.properties.name_th, language),
  }))
}

export function getAllSubDistrictOptions(language: Language): { value: string; label: string; parentId: string }[] {
  return subDistrictBoundaries.features.map((feature) => ({
    value: feature.properties.id,
    label: localizedName(feature.properties.name, feature.properties.name_th, language),
    parentId: feature.properties.district_id,
  }))
}

/** The area's value for every analysis year — null for a pending year (charts draw nothing there). */
export function getMetricSeries(id: string, metric: MetricKey): { year: Year; value: number | null }[] {
  return getAvailableYears().map((year) => {
    const stats = getAssessmentResult(id, year)
    return { year, value: stats ? stats[metric] : null }
  })
}

/**
 * The Comparison page's starting set: the districts with the highest, median
 * and lowest accessibility in the latest year with results. Names here are
 * only a seed — ComparePage re-resolves each name from its id on render.
 */
export function getDefaultComparisonAreas(): ComparisonArea[] {
  const year = getLatestYearWithResults()
  if (year === null) return []
  const districtRows = getAreaRowsForYear('district', year, 'en').sort((a, b) => b.access_pct - a.access_pct)
  if (districtRows.length < 3) return []
  const picks = [districtRows[0], districtRows[Math.floor(districtRows.length / 2)], districtRows[districtRows.length - 1]]
  return picks.map((row, index) => ({ id: row.id, name: row.name, color: comparisonPalette[index], level: 'district' as const }))
}

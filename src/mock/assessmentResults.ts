import type { AreaLevel } from './areas'
import { clamp, deterministicNoise } from './areas'
import { mockDistrictBoundaries, mockSubDistrictBoundaries, ringAreaSqm } from './mapBoundaries'
import { mockOpsPoints } from './opsPoints'
import { opsTypeValues, type OpsType } from '../config/opsTypes'
import { availableYears, type Year } from './years'

// The one area dataset for Map, Dashboard, and Compare — sub-district is the
// base level (one row per subdistrict_id × year, mock but deterministic, no
// Math.random); district and Bangkok are never stored, only rolled up on
// demand by summing the base rows and recomputing percentages (never by
// averaging a child's percentage). Field names match the real
// assessment_results DB table 1:1 (ops_count is the one addition) so the
// mock can be swapped for the API later without renaming.

export const BANGKOK_AREA_ID = 'bangkok'

/** One assessment_results row. Raw fields are kept as decimals — round only for display. */
export type AssessmentResult = {
  subdistrict_id: string
  year: Year
  total_area_sqm: number
  ops_area_sqm: number
  share_ops_pct: number
  total_population: number
  population_with_access: number
  access_pct: number
  /** Not part of assessment_results — the open-space-type breakdown, kept alongside. */
  ops_count: Record<OpsType, number>
}

/** What a district/Bangkok rollup produces — the same figures, without the row-identity fields. */
export type RolledUpResult = Omit<AssessmentResult, 'subdistrict_id' | 'year'>

export type MetricKey = 'access_pct' | 'share_ops_pct'

/** A rolled-up result plus display metadata, for table/list UI. */
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

// --- Raw per-sub-district-per-year generation ------------------------------

type Trend = 'improving' | 'flat'

let trendCounter = 0
function nextTrend(): Trend {
  trendCounter += 1
  return trendCounter % 2 === 0 ? 'improving' : 'flat'
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return hash
}

/** Deterministic value in [0, 1), keyed by an id + a salt so different fields don't correlate. */
function noise01(id: string, salt: string): number {
  const x = Math.sin(hashString(id + salt) * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const ANCHOR_YEAR: Year = 2026

/**
 * A plausible 2017→2026 trajectory for one base-level percentage:
 * "improving" sub-districts ramp up gradually to the 2026 anchor, "flat"
 * ones hover near it with small noise. Only ever applied at the sub-district
 * (base) level — district/Bangkok are summed from these, never trended
 * directly, so the roll-up stays exact regardless of how these move.
 */
function trendPct(trend: Trend, anchorPct: number, noiseSeedId: string, year: Year): number {
  const index = availableYears.indexOf(year)
  const anchorIndex = availableYears.indexOf(ANCHOR_YEAR)
  const isAnchor = year === ANCHOR_YEAR

  if (trend === 'improving') {
    const improvement = clamp(anchorPct * 0.3, 2, 12)
    const start = Math.max(0.5, anchorPct - improvement)
    const t = index / anchorIndex
    const noise = isAnchor ? 0 : deterministicNoise(noiseSeedId, index, 0.5)
    return clamp(start + (anchorPct - start) * t + noise, 0.5, 99)
  }

  const noise = isAnchor ? 0 : deterministicNoise(noiseSeedId, index, 0.7)
  return clamp(anchorPct + noise, 0.5, 99)
}

/** Slow, deterministic population drift toward the 2026 anchor — "population changes a little". */
function populationForYear(anchorPopulation: number, year: Year): number {
  return anchorPopulation / Math.pow(1.007, ANCHOR_YEAR - year)
}

// Grouped once so counting by (sub-district, year) doesn't rescan all ~300
// points for every one of the ~480 (sub-district × year) rows.
const opsPointsBySubDistrict = new Map<string, typeof mockOpsPoints.features>()
for (const feature of mockOpsPoints.features) {
  const list = opsPointsBySubDistrict.get(feature.properties.subdistrict_id) ?? []
  list.push(feature)
  opsPointsBySubDistrict.set(feature.properties.subdistrict_id, list)
}

/** Real counts from the mock OPS point dataset — only points opened by `year` count, so this genuinely grows over 2017–2026 instead of being a separate fabricated trend. */
function countOpsByType(subdistrictId: string, year: Year): Record<OpsType, number> {
  const counts = Object.fromEntries(opsTypeValues.map((type) => [type, 0])) as Record<OpsType, number>
  for (const feature of opsPointsBySubDistrict.get(subdistrictId) ?? []) {
    if (feature.properties.opened_year <= year) counts[feature.properties.ops_type] += 1
  }
  return counts
}

function buildAssessmentResults(): AssessmentResult[] {
  const rows: AssessmentResult[] = []

  for (const feature of mockSubDistrictBoundaries.features) {
    const id = feature.properties.id
    const totalAreaSqm = ringAreaSqm(feature.geometry.coordinates[0])
    const trend = nextTrend()
    const accessAnchorPct = clamp(15 + noise01(id, 'acc') * 80, 1, 98)
    const shareAnchorPct = clamp(2 + noise01(id, 'ops') * 13, 0.5, 20)
    // Averages ~110k/sub-district across the 48 sub-districts, landing the
    // citywide total near Bangkok's real registered population (~5.5M).
    const populationAnchor = 40_000 + noise01(id, 'pop') * 140_000

    for (const year of availableYears) {
      const accessPct = trendPct(trend, accessAnchorPct, `${id}-acc`, year)
      const sharePct = trendPct(trend, shareAnchorPct, `${id}-ops`, year)
      const totalPopulation = populationForYear(populationAnchor, year)
      const opsAreaSqm = (totalAreaSqm * sharePct) / 100
      const populationWithAccess = (totalPopulation * accessPct) / 100

      rows.push({
        subdistrict_id: id,
        year,
        total_area_sqm: totalAreaSqm,
        ops_area_sqm: opsAreaSqm,
        share_ops_pct: sharePct,
        total_population: totalPopulation,
        // Comes from the merged (union) service area at this sub-district,
        // not a sum of each park's own covered count — summing per-park
        // counts would double-count residents within walking distance of
        // more than one park.
        population_with_access: populationWithAccess,
        access_pct: accessPct,
        ops_count: countOpsByType(id, year),
      })
    }
  }

  return rows
}

const assessmentResults = buildAssessmentResults()

const resultByKey = new Map<string, AssessmentResult>()
for (const row of assessmentResults) resultByKey.set(`${row.subdistrict_id}__${row.year}`, row)

function getSubDistrictAssessmentResult(subdistrictId: string, year: Year): AssessmentResult | undefined {
  return resultByKey.get(`${subdistrictId}__${year}`)
}

const allSubDistrictIds = mockSubDistrictBoundaries.features.map((feature) => feature.properties.id)

const subDistrictIdsByDistrict = new Map<string, string[]>()
for (const feature of mockSubDistrictBoundaries.features) {
  const list = subDistrictIdsByDistrict.get(feature.properties.district_id) ?? []
  list.push(feature.properties.id)
  subDistrictIdsByDistrict.set(feature.properties.district_id, list)
}

// --- Roll-up -----------------------------------------------------------------

function sumResults(rows: RolledUpResult[]): RolledUpResult {
  const totalAreaSqm = rows.reduce((sum, row) => sum + row.total_area_sqm, 0)
  const opsAreaSqm = rows.reduce((sum, row) => sum + row.ops_area_sqm, 0)
  const totalPopulation = rows.reduce((sum, row) => sum + row.total_population, 0)
  const populationWithAccess = rows.reduce((sum, row) => sum + row.population_with_access, 0)
  const opsCount = Object.fromEntries(
    opsTypeValues.map((type) => [type, rows.reduce((sum, row) => sum + row.ops_count[type], 0)]),
  ) as Record<OpsType, number>

  return {
    total_area_sqm: totalAreaSqm,
    ops_area_sqm: opsAreaSqm,
    share_ops_pct: totalAreaSqm > 0 ? (opsAreaSqm / totalAreaSqm) * 100 : 0,
    total_population: totalPopulation,
    population_with_access: populationWithAccess,
    access_pct: totalPopulation > 0 ? (populationWithAccess / totalPopulation) * 100 : 0,
    ops_count: opsCount,
  }
}

/**
 * The single rollup entry point for Map, Dashboard, and Compare: a
 * sub-district's own raw row, or — for a district or Bangkok — its member
 * sub-districts' raw values summed and recomputed into percentages. Never
 * averages a child's percentage.
 */
export function getAssessmentResult(areaId: string, year: Year): RolledUpResult | undefined {
  if (areaId === BANGKOK_AREA_ID) {
    return sumResults(allSubDistrictIds.map((id) => getSubDistrictAssessmentResult(id, year)!))
  }
  const subDistrictIds = subDistrictIdsByDistrict.get(areaId)
  if (subDistrictIds) return sumResults(subDistrictIds.map((id) => getSubDistrictAssessmentResult(id, year)!))
  return getSubDistrictAssessmentResult(areaId, year)
}

// --- Metadata / options -------------------------------------------------------

type AreaMeta = { id: string; name: string; level: AreaLevel; parentId: string | null; parentName: string | null }

const districtNameById = new Map(mockDistrictBoundaries.features.map((feature) => [feature.properties.id, feature.properties.name]))

export function getAreaMeta(id: string): AreaMeta | undefined {
  if (id === BANGKOK_AREA_ID) return { id, name: 'Bangkok', level: 'district', parentId: null, parentName: null }

  const district = mockDistrictBoundaries.features.find((feature) => feature.properties.id === id)
  if (district) return { id, name: district.properties.name, level: 'district', parentId: null, parentName: null }

  const subDistrict = mockSubDistrictBoundaries.features.find((feature) => feature.properties.id === id)
  if (subDistrict) {
    const parentId = subDistrict.properties.district_id
    return { id, name: subDistrict.properties.name, level: 'sub-district', parentId, parentName: districtNameById.get(parentId) ?? null }
  }

  return undefined
}

export function getAreaRow(id: string, year: Year): AreaRow | undefined {
  const meta = getAreaMeta(id)
  const stats = getAssessmentResult(id, year)
  if (!meta || !stats) return undefined
  return { ...stats, id: meta.id, name: meta.name, level: meta.level, parentId: meta.parentId, year }
}

export function getAreaRowsForYear(level: AreaLevel, year: Year): AreaRow[] {
  const ids = level === 'district' ? mockDistrictBoundaries.features.map((feature) => feature.properties.id) : allSubDistrictIds
  return ids.map((id) => getAreaRow(id, year)).filter((row): row is AreaRow => row !== undefined)
}

export function areaHasAnyData(id: string): boolean {
  return getAreaMeta(id) !== undefined
}

export function getFirstAreaId(level: AreaLevel): string {
  return level === 'district' ? mockDistrictBoundaries.features[0].properties.id : allSubDistrictIds[0]
}

export function getDistrictOptions(): { value: string; label: string }[] {
  return mockDistrictBoundaries.features.map((feature) => ({ value: feature.properties.id, label: feature.properties.name }))
}

export function getAllSubDistrictOptions(): { value: string; label: string; parentId: string }[] {
  return mockSubDistrictBoundaries.features.map((feature) => ({
    value: feature.properties.id,
    label: feature.properties.name,
    parentId: feature.properties.district_id,
  }))
}

export function getMetricSeries(id: string, metric: MetricKey): { year: Year; value: number | null }[] {
  return availableYears.map((year) => {
    const stats = getAssessmentResult(id, year)
    return { year, value: stats ? stats[metric] : null }
  })
}

// District A, D, J's old role — highest/median/lowest accessibility, picked
// dynamically now that district ids are generated rather than hand-authored.
const COMPARISON_PALETTE = ['#1B4332', '#3F8F63', '#C2660F']

function buildDefaultComparisonAreas(): ComparisonArea[] {
  const districtRows = getAreaRowsForYear('district', ANCHOR_YEAR).sort((a, b) => b.access_pct - a.access_pct)
  const picks = [districtRows[0], districtRows[Math.floor(districtRows.length / 2)], districtRows[districtRows.length - 1]]
  return picks.map((row, index) => ({ id: row.id, name: row.name, color: COMPARISON_PALETTE[index], level: 'district' as const }))
}

export const defaultComparisonAreas: ComparisonArea[] = buildDefaultComparisonAreas()

// --- Dev-only roll-up validation -----------------------------------------------

if (import.meta.env.DEV) validateRollups()

function approxEqual(a: number, b: number, epsilon = 1e-6): boolean {
  return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b))
}

/**
 * Independently re-derives each district's (and Bangkok's) raw totals
 * straight from the base sub-district rows — a fresh grouping and plain
 * sums, not a reuse of sumResults/getAssessmentResult — and checks they
 * match what the production roll-up returns, plus the covered-population
 * and area constraints the roll-up depends on.
 */
function validateRollups(): void {
  const groups = new Map<string, string[]>()
  for (const feature of mockSubDistrictBoundaries.features) {
    const list = groups.get(feature.properties.district_id) ?? []
    list.push(feature.properties.id)
    groups.set(feature.properties.district_id, list)
  }

  for (const year of availableYears) {
    for (const [districtId, subDistrictIds] of groups) {
      const children = subDistrictIds.map((id) => getSubDistrictAssessmentResult(id, year)!)
      const expectedArea = children.reduce((sum, row) => sum + row.total_area_sqm, 0)
      const expectedOpsArea = children.reduce((sum, row) => sum + row.ops_area_sqm, 0)
      const expectedPopulation = children.reduce((sum, row) => sum + row.total_population, 0)
      const expectedCovered = children.reduce((sum, row) => sum + row.population_with_access, 0)
      const actual = getAssessmentResult(districtId, year)!

      if (!approxEqual(actual.total_area_sqm, expectedArea)) console.error(`[assessmentResults] ${districtId}/${year}: total_area_sqm != sum of children`)
      if (!approxEqual(actual.ops_area_sqm, expectedOpsArea)) console.error(`[assessmentResults] ${districtId}/${year}: ops_area_sqm != sum of children`)
      if (!approxEqual(actual.total_population, expectedPopulation)) console.error(`[assessmentResults] ${districtId}/${year}: total_population != sum of children`)
      if (!approxEqual(actual.population_with_access, expectedCovered)) console.error(`[assessmentResults] ${districtId}/${year}: population_with_access != sum of children`)
    }

    const bangkokRows = allSubDistrictIds.map((id) => getSubDistrictAssessmentResult(id, year)!)
    const bangkok = getAssessmentResult(BANGKOK_AREA_ID, year)!
    const expectedBangkokPopulation = bangkokRows.reduce((sum, row) => sum + row.total_population, 0)
    const expectedBangkokCovered = bangkokRows.reduce((sum, row) => sum + row.population_with_access, 0)
    if (!approxEqual(bangkok.total_population, expectedBangkokPopulation)) console.error(`[assessmentResults] bangkok/${year}: total_population != sum of all sub-districts`)
    if (!approxEqual(bangkok.population_with_access, expectedBangkokCovered)) console.error(`[assessmentResults] bangkok/${year}: population_with_access != sum of all sub-districts`)
  }

  for (const row of assessmentResults) {
    const coveredPlusNotCovered = row.population_with_access + (row.total_population - row.population_with_access)
    if (!approxEqual(coveredPlusNotCovered, row.total_population)) {
      console.error(`[assessmentResults] ${row.subdistrict_id}/${row.year}: covered + not covered != population`)
    }
    if (row.population_with_access > row.total_population) console.error(`[assessmentResults] ${row.subdistrict_id}/${row.year}: population_with_access > total_population`)
    if (row.ops_area_sqm >= row.total_area_sqm) console.error(`[assessmentResults] ${row.subdistrict_id}/${row.year}: ops_area_sqm >= total_area_sqm`)
  }
}

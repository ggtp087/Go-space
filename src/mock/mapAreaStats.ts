import { generateYearSeries, getAreaIndicators, type AreaRow, type AreaSeed, type Trend } from './areas'
import { mockDistrictBoundaries, mockSubDistrictBoundaries } from './mapBoundaries'
import { availableYears, type Year } from './years'

// Area Details stats for the Map page's own district/sub-district selection
// (and a whole-Bangkok summary) — a separate dataset from mock/districts.ts
// and mock/subdistricts.ts, which drive the Dashboard/Compare pages and use
// their own unrelated district-a..j ids. This one is keyed to the geo ids in
// mapBoundaries.ts, since those are what the map's selection actually filters
// by. Sub-district numbers are generated directly; district and Bangkok
// numbers roll up from their children, so at least the default (2026) year
// is internally consistent top to bottom.

export const BANGKOK_AREA_ID = 'bangkok'

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return hash
}

/** Deterministic [0, 1) value, keyed by an id + a salt so different fields don't correlate. */
function noise01(id: string, salt: string): number {
  const x = Math.sin(hashString(id + salt) * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

let trendCounter = 0
function nextTrend(): Trend {
  trendCounter += 1
  return trendCounter % 2 === 0 ? 'improving' : 'flat'
}

type Anchor = { id: string; name: string; parentId: string | null; population: number; accessibilityPct: number; openSpaces: number; opsSharePct: number }

function weightedAverage(items: { weight: number; value: number }[]): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight === 0) return 0
  return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
}

const subDistrictAnchors: Anchor[] = mockSubDistrictBoundaries.features.map((feature) => {
  const id = feature.properties.id
  return {
    id,
    name: feature.properties.name,
    parentId: feature.properties.district_id,
    population: Math.round(2_000 + noise01(id, 'pop') * 13_000),
    accessibilityPct: Math.round(15 + noise01(id, 'acc') * 80),
    openSpaces: Math.round(noise01(id, 'ops') * 5),
    opsSharePct: Math.round((1 + noise01(id, 'share') * 14) * 10) / 10,
  }
})

const subDistrictsByDistrict = new Map<string, Anchor[]>()
for (const sub of subDistrictAnchors) {
  const list = subDistrictsByDistrict.get(sub.parentId as string) ?? []
  list.push(sub)
  subDistrictsByDistrict.set(sub.parentId as string, list)
}

const districtAnchors: Anchor[] = mockDistrictBoundaries.features.map((feature) => {
  const id = feature.properties.id
  const children = subDistrictsByDistrict.get(id) ?? []
  return {
    id,
    name: feature.properties.name,
    parentId: null,
    population: children.reduce((sum, c) => sum + c.population, 0),
    accessibilityPct: Math.round(weightedAverage(children.map((c) => ({ weight: c.population, value: c.accessibilityPct })))),
    openSpaces: children.reduce((sum, c) => sum + c.openSpaces, 0),
    opsSharePct: Math.round(weightedAverage(children.map((c) => ({ weight: c.population, value: c.opsSharePct }))) * 10) / 10,
  }
})

const bangkokAnchor: Anchor = {
  id: BANGKOK_AREA_ID,
  name: 'Bangkok',
  parentId: null,
  population: districtAnchors.reduce((sum, d) => sum + d.population, 0),
  accessibilityPct: Math.round(weightedAverage(districtAnchors.map((d) => ({ weight: d.population, value: d.accessibilityPct })))),
  openSpaces: districtAnchors.reduce((sum, d) => sum + d.openSpaces, 0),
  opsSharePct: Math.round(weightedAverage(districtAnchors.map((d) => ({ weight: d.population, value: d.opsSharePct }))) * 10) / 10,
}

function toSeed(anchor: Anchor, level: AreaSeed['level']): AreaSeed {
  return { ...anchor, level, trend: nextTrend() }
}

const allSeeds: AreaSeed[] = [
  toSeed(bangkokAnchor, 'district'),
  ...districtAnchors.map((anchor) => toSeed(anchor, 'district')),
  ...subDistrictAnchors.map((anchor) => toSeed(anchor, 'sub-district')),
]

const allRows: AreaRow[] = allSeeds.flatMap((seed) => generateYearSeries(seed))
const nameById = new Map(allSeeds.map((seed) => [seed.id, seed.name]))

export type MapAreaMeta = { id: string; name: string; parentId: string | null; parentName: string | null }

/** Static metadata (name, parent) for a map area — independent of any one year. */
export function getMapAreaMeta(id: string): MapAreaMeta | undefined {
  const seed = allSeeds.find((s) => s.id === id)
  if (!seed) return undefined
  return { id: seed.id, name: seed.name, parentId: seed.parentId, parentName: seed.parentId ? (nameById.get(seed.parentId) ?? null) : null }
}

/** The data row for one map area in one year, or undefined if that area/year has no row. */
export function getMapAreaRow(id: string, year: Year): AreaRow | undefined {
  return allRows.find((row) => row.id === id && row.year === year)
}

export function mapAreaHasAnyData(id: string): boolean {
  return allSeeds.some((seed) => seed.id === id)
}

export type MapMetricKey = 'accessibilityPct' | 'openSpaceSharePct'
export type MapMetricPoint = { year: Year; value: number | null }

/** One metric's value across every sample year for a map area — null where data is missing. */
export function getMapMetricSeries(id: string, metric: MapMetricKey): MapMetricPoint[] {
  return availableYears.map((year) => {
    const row = getMapAreaRow(id, year)
    if (!row) return { year, value: null }
    if (metric === 'accessibilityPct') return { year, value: row.accessibilityPct }
    return { year, value: getAreaIndicators(row)[metric] }
  })
}

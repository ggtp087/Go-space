import { getAreaIndicators, type AreaLevel, type AreaRow } from './areas'
import { allDistrictRows, districtSeeds, getDistrictOptions } from './districts'
import { allSubDistrictRows, getSubDistrictParentId, subDistrictSeeds } from './subdistricts'
import { availableYears, type Year } from './years'

const allSeeds = [...districtSeeds, ...subDistrictSeeds]
const allRows: AreaRow[] = [...allDistrictRows, ...allSubDistrictRows]

export type AreaMeta = {
  id: string
  name: string
  level: AreaLevel
  parentId: string | null
  parentName: string | null
}

const districtNameById = new Map(districtSeeds.map((seed) => [seed.id, seed.name]))

/** Static metadata (name, level, parent) for an area — independent of any one year. */
export function getAreaMeta(id: string): AreaMeta | undefined {
  const seed = allSeeds.find((s) => s.id === id)
  if (!seed) return undefined
  return {
    id: seed.id,
    name: seed.name,
    level: seed.level,
    parentId: seed.parentId,
    parentName: seed.parentId ? districtNameById.get(seed.parentId) ?? null : null,
  }
}

/** The data row for one area in one year, or undefined if that year is missing. */
export function getAreaRow(id: string, year: Year): AreaRow | undefined {
  return allRows.find((row) => row.id === id && row.year === year)
}

export function getAreaRowsForYear(level: AreaLevel, year: Year): AreaRow[] {
  return allRows.filter((row) => row.level === level && row.year === year)
}

export function getFirstAreaId(level: AreaLevel): string {
  return level === 'district' ? districtSeeds[0].id : subDistrictSeeds[0].id
}

export { getDistrictOptions, getSubDistrictParentId }

export type MetricKey = 'accessibilityPct' | 'openSpaceSharePct' | 'streetsPct' | 'builtUpOpenPct'

export type MetricPoint = { year: Year; value: number | null }

/** One metric's value across every sample year for an area — null where data is missing. */
export function getMetricSeries(id: string, metric: MetricKey): MetricPoint[] {
  return availableYears.map((year) => {
    const row = getAreaRow(id, year)
    if (!row) return { year, value: null }
    if (metric === 'accessibilityPct') return { year, value: row.accessibilityPct }
    return { year, value: getAreaIndicators(row)[metric] }
  })
}

export function areaHasAnyData(id: string): boolean {
  return allRows.some((row) => row.id === id)
}

import { applyGaps, generateYearSeries, type AreaRow, type AreaSeed, type Gap, type Trend } from './areas'
import { districtSeeds } from './districts'

// 3–4 sub-districts per district (e.g. District A → A1, A2, A3...), derived
// from the parent's 2026 anchors so the two levels stay roughly consistent.
const CHILD_COUNTS: Record<string, number> = {
  'district-a': 4,
  'district-b': 3,
  'district-c': 4,
  'district-d': 3,
  'district-e': 4,
  'district-f': 3,
  'district-g': 4,
  'district-h': 3,
  'district-i': 4,
  'district-j': 3,
}

const POPULATION_WEIGHTS: Record<number, number[]> = {
  3: [0.42, 0.34, 0.24],
  4: [0.32, 0.27, 0.23, 0.18],
}

let trendCounter = 0
function nextTrend(): Trend {
  trendCounter += 1
  return trendCounter % 2 === 0 ? 'improving' : 'flat'
}

function letterFromDistrictId(districtId: string): string {
  return districtId.replace('district-', '').toUpperCase()
}

function buildChildSeeds(parent: AreaSeed): AreaSeed[] {
  const count = CHILD_COUNTS[parent.id] ?? 3
  const weights = POPULATION_WEIGHTS[count]
  const letter = letterFromDistrictId(parent.id)

  return weights.map((weight, index) => {
    const spread = 6
    const offset = (index - (count - 1) / 2) * spread
    const accessibilityPct = Math.round(Math.min(98, Math.max(3, parent.accessibilityPct + offset)))
    const population = Math.round(parent.population * weight)
    const openSpaces = Math.max(0, Math.round(parent.openSpaces * weight))
    const opsSharePct = Math.round(parent.opsSharePct * (accessibilityPct / parent.accessibilityPct) * 10) / 10

    return {
      id: `${parent.id}-${index + 1}`,
      level: 'sub-district',
      parentId: parent.id,
      name: `${letter}${index + 1}`,
      population,
      accessibilityPct,
      openSpaces,
      opsSharePct,
      trend: nextTrend(),
    } satisfies AreaSeed
  })
}

export const subDistrictSeeds: AreaSeed[] = districtSeeds.flatMap((parent) => buildChildSeeds(parent))

// A couple of sub-districts are missing 1–2 years too, same as some districts.
const SUB_DISTRICT_GAPS: Gap[] = [
  { id: 'district-c-2', years: [2017, 2018] },
  { id: 'district-h-1', years: [2019] },
]

export const allSubDistrictRows: AreaRow[] = applyGaps(
  subDistrictSeeds.flatMap((seed) => generateYearSeries(seed)),
  SUB_DISTRICT_GAPS,
)

export function getSubDistrictOptions(districtId: string): { value: string; label: string }[] {
  return subDistrictSeeds
    .filter((seed) => seed.parentId === districtId)
    .map((seed) => ({ value: seed.id, label: seed.name }))
}

export function getAllSubDistrictOptions(): { value: string; label: string; parentId: string }[] {
  return subDistrictSeeds.map((seed) => ({ value: seed.id, label: seed.name, parentId: seed.parentId as string }))
}

export function getSubDistrictParentId(subDistrictId: string): string | undefined {
  return subDistrictSeeds.find((seed) => seed.id === subDistrictId)?.parentId ?? undefined
}

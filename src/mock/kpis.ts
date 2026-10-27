import { BANGKOK_AREA_ID, getAssessmentResult, totalOpsCount } from './assessmentResults'
import { roundPct } from './areas'
import type { Year } from './years'

export type KpiSample = {
  id: string
  value: string
  label: string
  tone: 'green' | 'amber'
}

/** Citywide KPIs — rolled up from the one area dataset (Bangkok = sum of every sub-district), never a separate anchor. */
export function getKpisForYear(year: Year): KpiSample[] {
  const bangkok = getAssessmentResult(BANGKOK_AREA_ID, year)!
  const totalPopulation = Math.round(bangkok.total_population)
  const covered = Math.round(bangkok.population_with_access)
  const notCovered = totalPopulation - covered
  const spaces = totalOpsCount(bangkok.ops_count)

  return [
    {
      id: 'accessibility',
      value: `${Math.round(bangkok.access_pct)}%`,
      label: 'Population accessibility — within 400 m of green & open space',
      tone: 'green',
    },
    { id: 'covered', value: covered.toLocaleString(), label: 'Residents covered by a 400 m service area', tone: 'green' },
    { id: 'notCovered', value: notCovered.toLocaleString(), label: 'Residents not covered by a 400 m service area', tone: 'amber' },
    { id: 'spaces', value: spaces.toLocaleString(), label: 'Public green & open spaces mapped citywide', tone: 'green' },
    {
      id: 'opsShare',
      value: `${roundPct(bangkok.share_ops_pct)}%`,
      label: 'Share of open public space (SDG 11.7.1)',
      tone: 'green',
    },
  ]
}

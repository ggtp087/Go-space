import type { Year } from './years'

export type KpiSample = {
  id: string
  year: Year
  value: string
  label: string
  tone: 'green' | 'amber'
}

export const sampleKpis: KpiSample[] = [
  // 2026
  { id: 'accessibility', year: 2026, value: '54.2%', label: 'Population accessibility — within 400 m of green & open space', tone: 'green' },
  { id: 'covered', year: 2026, value: '2,978,254', label: 'Residents covered by a 400 m service area', tone: 'green' },
  { id: 'notCovered', year: 2026, value: '2,516,678', label: 'Residents not covered by a 400 m service area', tone: 'amber' },
  { id: 'spaces', year: 2026, value: '1,247', label: 'Public green & open spaces mapped citywide', tone: 'green' },
  { id: 'opsShare', year: 2026, value: '6.8%', label: 'Built-up area that is open space for public use (SDG 11.7.1)', tone: 'green' },
  // 2024 — earlier sample year, slightly lower coverage
  { id: 'accessibility', year: 2024, value: '49.8%', label: 'Population accessibility — within 400 m of green & open space', tone: 'green' },
  { id: 'covered', year: 2024, value: '2,738,436', label: 'Residents covered by a 400 m service area', tone: 'green' },
  { id: 'notCovered', year: 2024, value: '2,756,496', label: 'Residents not covered by a 400 m service area', tone: 'amber' },
  { id: 'spaces', year: 2024, value: '1,198', label: 'Public green & open spaces mapped citywide', tone: 'green' },
  { id: 'opsShare', year: 2024, value: '6.1%', label: 'Built-up area that is open space for public use (SDG 11.7.1)', tone: 'green' },
]

export function getKpisForYear(year: Year): KpiSample[] {
  return sampleKpis.filter((kpi) => kpi.year === year)
}

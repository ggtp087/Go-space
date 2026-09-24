export type KpiSample = {
  id: string
  value: string
  label: string
  tone: 'green' | 'amber'
}

export const sampleKpis: KpiSample[] = [
  { id: 'accessibility', value: '54.2%', label: 'Population accessibility — within 400 m of green & open space', tone: 'green' },
  { id: 'covered', value: '2,978,254', label: 'Residents covered by a 400 m service area', tone: 'green' },
  { id: 'notCovered', value: '2,516,678', label: 'Residents not covered by a 400 m service area', tone: 'amber' },
  { id: 'spaces', value: '1,247', label: 'Public green & open spaces mapped citywide', tone: 'green' },
  { id: 'opsShare', value: '6.8%', label: 'Built-up area that is open space for public use (SDG 11.7.1)', tone: 'green' },
]

import { clamp, deterministicNoise } from './areas'
import { availableYears, type Year } from './years'

export type KpiSample = {
  id: string
  value: string
  label: string
  tone: 'green' | 'amber'
}

// Citywide anchors for 2026 (kept from the original sample figures), with a
// gradual citywide improvement back to 2017 — independent of the 10 sample
// districts, which only cover a slice of the city.
const ANCHOR_YEAR: Year = 2026
const ANCHOR_ACCESSIBILITY_PCT = 54.2
const ANCHOR_POPULATION = 5_494_932 // covered + not covered at the anchor year
const ANCHOR_SPACES = 1247
const ANCHOR_BUILT_UP_OPEN_PCT = 6.8

function accessibilityPctForYear(year: Year): number {
  const index = availableYears.indexOf(year)
  const anchorIndex = availableYears.indexOf(ANCHOR_YEAR)
  const start = ANCHOR_ACCESSIBILITY_PCT - 9
  const t = index / anchorIndex
  const noise = year === ANCHOR_YEAR ? 0 : deterministicNoise('citywide-accessibility', index, 0.6)
  return Math.round(clamp(start + (ANCHOR_ACCESSIBILITY_PCT - start) * t + noise, 1, 99) * 10) / 10
}

function populationForYear(year: Year): number {
  return Math.round(ANCHOR_POPULATION / Math.pow(1.006, ANCHOR_YEAR - year))
}

export function getKpisForYear(year: Year): KpiSample[] {
  const accessibilityPct = accessibilityPctForYear(year)
  const population = populationForYear(year)
  const covered = Math.round((population * accessibilityPct) / 100)
  const notCovered = population - covered
  const scale = accessibilityPct / ANCHOR_ACCESSIBILITY_PCT
  const spaces = Math.max(0, Math.round(ANCHOR_SPACES * scale))
  const builtUpOpenPct = Math.round(ANCHOR_BUILT_UP_OPEN_PCT * scale * 10) / 10

  return [
    {
      id: 'accessibility',
      value: `${accessibilityPct}%`,
      label: 'Population accessibility — within 400 m of green & open space',
      tone: 'green',
    },
    { id: 'covered', value: covered.toLocaleString(), label: 'Residents covered by a 400 m service area', tone: 'green' },
    { id: 'notCovered', value: notCovered.toLocaleString(), label: 'Residents not covered by a 400 m service area', tone: 'amber' },
    { id: 'spaces', value: spaces.toLocaleString(), label: 'Public green & open spaces mapped citywide', tone: 'green' },
    {
      id: 'opsShare',
      value: `${builtUpOpenPct}%`,
      label: 'Built-up area that is open space for public use (SDG 11.7.1)',
      tone: 'green',
    },
  ]
}

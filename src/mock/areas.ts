import { availableYears, type Year } from './years'

export type AreaLevel = 'district' | 'sub-district'

export type AreaRow = {
  id: string
  level: AreaLevel
  /** District id for a sub-district; null for a district itself. */
  parentId: string | null
  year: Year
  name: string
  population: number
  accessibilityPct: number
  openSpaces: number
  opsSharePct: number
}

export type Trend = 'improving' | 'flat'

/** The anchor (2026) values a year-series is generated from. */
export type AreaSeed = {
  id: string
  level: AreaLevel
  parentId: string | null
  name: string
  population: number
  accessibilityPct: number
  openSpaces: number
  opsSharePct: number
  trend: Trend
}

export type Gap = { id: string; years: Year[] }

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
  return hash
}

/** Deterministic "noise" in [-amplitude, amplitude] — stable across reloads, no Math.random. */
export function deterministicNoise(seedId: string, salt: number, amplitude: number): number {
  const x = Math.sin(hashString(seedId) * 12.9898 + salt * 78.233) * 43758.5453
  const frac = x - Math.floor(x)
  return (frac * 2 - 1) * amplitude
}

const ANCHOR_YEAR: Year = 2026

/**
 * Generates a full 2017–2026 series for one area from its 2026 anchor values.
 * "improving" areas ramp up gradually to the anchor; "flat" areas hover near
 * it with small noise. The anchor year itself is always exact (no noise), so
 * previously-shown 2026 figures never drift.
 */
export function generateYearSeries(seed: AreaSeed): AreaRow[] {
  const anchorIndex = availableYears.indexOf(ANCHOR_YEAR)

  return availableYears.map((year, index) => {
    const isAnchor = year === ANCHOR_YEAR
    let accessibilityPct: number

    if (seed.trend === 'improving') {
      const improvement = clamp(seed.accessibilityPct * 0.35, 6, 24)
      const startPct = Math.max(4, seed.accessibilityPct - improvement)
      const t = index / anchorIndex
      const noise = isAnchor ? 0 : deterministicNoise(seed.id, index, 1.2)
      accessibilityPct = Math.round(clamp(startPct + (seed.accessibilityPct - startPct) * t + noise, 1, 99))
    } else {
      const noise = isAnchor ? 0 : deterministicNoise(seed.id, index, 1.5)
      accessibilityPct = Math.round(clamp(seed.accessibilityPct + noise, 1, 99))
    }

    const scale = accessibilityPct / seed.accessibilityPct
    const openSpaces = Math.max(0, Math.round(seed.openSpaces * scale))
    const opsSharePct = Math.round(seed.opsSharePct * scale * 10) / 10
    const population = Math.round(seed.population / Math.pow(1.007, ANCHOR_YEAR - year))

    return {
      id: seed.id,
      level: seed.level,
      parentId: seed.parentId,
      year,
      name: seed.name,
      population,
      accessibilityPct,
      openSpaces,
      opsSharePct,
    }
  })
}

/** Removes rows matching the given (id, year) gaps — used to test "no data" states. */
export function applyGaps(rows: AreaRow[], gaps: Gap[]): AreaRow[] {
  const gapKeys = new Set(gaps.flatMap((gap) => gap.years.map((year) => `${gap.id}__${year}`)))
  return rows.filter((row) => !gapKeys.has(`${row.id}__${row.year}`))
}

/** Color for a given accessibility percentage, on the 5-step scale. */
export function accessibilityColor(pct: number): string {
  if (pct >= 80) return '#2A7A54'
  if (pct >= 65) return '#7FB88F'
  if (pct >= 50) return '#D8D3A0'
  if (pct >= 30) return '#E4B064'
  return '#D9822B'
}

/** Residents covered vs. not covered by a 400 m service area — always sums to population. */
export function getCoverage(row: AreaRow): { covered: number; notCovered: number } {
  const covered = Math.round((row.population * row.accessibilityPct) / 100)
  return { covered, notCovered: row.population - covered }
}

/**
 * SDG 11.7.1 area-based indicators. Built-up area open for public use is kept
 * larger than the open space share by construction, per the site's data rules.
 */
export function getAreaIndicators(row: AreaRow): { openSpaceSharePct: number; streetsPct: number; builtUpOpenPct: number } {
  const streetsPct = Math.round(row.opsSharePct * 1.15 * 10) / 10
  const builtUpOpenPct = Math.round(row.opsSharePct * 1.4 * 10) / 10
  return { openSpaceSharePct: row.opsSharePct, streetsPct, builtUpOpenPct }
}

export type AccessibilityBracket = {
  color: string
  label: string
  count: number
}

const ACCESSIBILITY_BANDS = [
  { min: 80, max: 100, color: '#2A7A54', label: '80–100%' },
  { min: 65, max: 79, color: '#7FB88F', label: '65–79%' },
  { min: 50, max: 64, color: '#D8D3A0', label: '50–64%' },
  { min: 30, max: 49, color: '#E4B064', label: '30–49%' },
  { min: 0, max: 29, color: '#D9822B', label: '0–29%' },
]

/** How many of the given rows fall into each step of the 5-step accessibility scale. */
export function getAccessibilityBrackets(rows: AreaRow[]): AccessibilityBracket[] {
  return ACCESSIBILITY_BANDS.map((band) => ({
    color: band.color,
    label: band.label,
    count: rows.filter((row) => row.accessibilityPct >= band.min && row.accessibilityPct <= band.max).length,
  }))
}

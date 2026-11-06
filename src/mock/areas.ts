// Generic, dataset-independent helpers shared by whichever area dataset is
// in use (currently mock/assessmentResults.ts) — deterministic noise, and
// percentage display rounding. The accessibility color scale itself lives
// in config/mapStyle.ts (accessibilityScale) — this just re-exposes it
// through the two shapes dataset/UI code here already expects.

import { accessibilityScale, getAccessibilityBand, getAccessibilityColor } from '../config/mapStyle'
import type { Language } from '../i18n/LanguageContext'

export type AreaLevel = 'district' | 'sub-district'

/** Picks a district/sub-district/Bangkok's name in the current UI language — the one place that choice happens, so every list/chart/table that already reads `.name` stays correct without touching its own code. */
export function localizedName(nameEn: string, nameTh: string, language: Language): string {
  return language === 'th' ? nameTh : nameEn
}

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

/** Rounds a raw decimal value for display only — never store a rounded value. */
export function roundPct(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * The one percent-display formatter for the Dashboard and Comparison pages —
 * always one decimal (e.g. "79.0%"), so a whole-number value never silently
 * drops its decimal the way `${roundPct(value)}%` does (roundPct(79) is the
 * number 79, which interpolates as "79" not "79.0"). Every displayed
 * percentage on those two pages should go through this, not roundPct+`%`
 * directly, so the decimal can't drift back out of sync.
 */
export function formatPct(value: number): string {
  return `${roundPct(value).toFixed(1)}%`
}

/** Color for a given accessibility percentage, on the 5-step scale. */
export function accessibilityColor(pct: number): string {
  return getAccessibilityColor(pct)
}

export type AccessibilityBracket = {
  color: string
  label: string
  count: number
  population: number
  ids: string[]
}

/** How many (and which) of the given areas fall into each step of the 5-step scale — classified the same way (on the rounded value) as the bar/choropleth colors, via getAccessibilityBand. Carries each band's area ids (for a legend-click highlight) and total population (for a "3 districts · 410,000 people" row). */
export function getAccessibilityBrackets(rows: { id: string; access_pct: number; total_population: number }[]): AccessibilityBracket[] {
  return accessibilityScale
    .slice()
    .reverse()
    .map((band) => {
      const matching = rows.filter((row) => getAccessibilityBand(row.access_pct) === band)
      return {
        color: band.color,
        label: band.label,
        count: matching.length,
        population: matching.reduce((sum, row) => sum + row.total_population, 0),
        ids: matching.map((row) => row.id),
      }
    })
}

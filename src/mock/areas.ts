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
 * Display precision per percentage indicator. Accessibility: 1 decimal (its
 * classes are also decided on the value rounded to 1 decimal). Share of OPS:
 * 2 decimals — Bangkok's share is only ~0.7–0.8%, so 1 decimal hides almost
 * every year-to-year change. Pass these to the formatters below rather than
 * hard-coding a precision at the call site.
 */
export const PCT_DECIMALS = { access_pct: 1, share_ops_pct: 2 } as const

/** A percentage as a fixed-decimal number string without the "%" (chart labels, tooltips that add their own unit). */
export function formatPctNumber(value: number, decimals = 1): string {
  const rounded = roundPct(value, decimals)
  // -0 would print as "-0.00" in some engines' paths; normalize it.
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(decimals)
}

/**
 * The one percent-display formatter — always a fixed number of decimals
 * (e.g. "79.0%", "0.79%"), so a whole-number value never silently drops its
 * decimal the way `${roundPct(value)}%` does. Every displayed percentage
 * goes through this (with PCT_DECIMALS for the indicator), so precision
 * can't drift between places.
 */
export function formatPct(value: number, decimals = 1): string {
  return `${formatPctNumber(value, decimals)}%`
}

/** A change in percentage points at the given precision, signed: "+0.05", "−1.2", "0.00" (no unit). */
export function formatPctChange(delta: number, decimals = 1): string {
  const rounded = roundPct(delta, decimals)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toFixed(decimals)}`
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

/** How many (and which) of the given areas fall into each step of the 5-step scale — classified the same way (on the value rounded to one decimal) as the bar/choropleth colors, via getAccessibilityBand. Carries each band's area ids (for a legend-click highlight) and total population (for a "3 districts · 410,000 people" row). */
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

// Generic, dataset-independent helpers shared by whichever area dataset is
// in use (currently mock/assessmentResults.ts) — deterministic noise, the
// accessibility color scale, and percentage display rounding.

export type AreaLevel = 'district' | 'sub-district'

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

/** Color for a given accessibility percentage, on the 5-step scale. */
export function accessibilityColor(pct: number): string {
  if (pct >= 80) return '#2A7A54'
  if (pct >= 65) return '#7FB88F'
  if (pct >= 50) return '#D8D3A0'
  if (pct >= 30) return '#E4B064'
  return '#D9822B'
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

/** How many of the given accessibility percentages fall into each step of the 5-step scale. */
export function getAccessibilityBrackets(values: number[]): AccessibilityBracket[] {
  return ACCESSIBILITY_BANDS.map((band) => ({
    color: band.color,
    label: band.label,
    count: values.filter((value) => value >= band.min && value <= band.max).length,
  }))
}

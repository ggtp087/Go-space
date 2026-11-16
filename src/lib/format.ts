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
  // Normalize -0 so a tiny negative never prints as "-0.00".
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(decimals)
}

/**
 * The one percent-display formatter — always a fixed number of decimals
 * (e.g. "79.0%", "0.79%"), so a whole-number value never silently drops its
 * decimal. Every displayed percentage goes through this (with PCT_DECIMALS
 * for the indicator), so precision can't drift between places.
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

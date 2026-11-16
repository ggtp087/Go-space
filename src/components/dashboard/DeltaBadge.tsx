import type { Language } from '../../i18n/LanguageContext'
import type { Strings } from '../../i18n/strings'
import { formatYear } from '../../i18n/formatYear'
import { formatPct, formatPctChange, roundPct } from '../../lib/format'
import type { Year } from '../../data/years'

type DeltaBadgeKind = 'vsPreviousYear' | 'sinceYear'

type DeltaBadgeProps = {
  currentValue: number
  compareValue: number
  kind: DeltaBadgeKind
  /** The year compareValue is from. */
  compareYear: Year
  unit?: string
  /** Compact form for a table cell / tight column: "+0.2 pp", with the full sentence as a hover tooltip. */
  compact?: boolean
  /** Display precision of the values and the change (PCT_DECIMALS) — 2 for share of OPS, 1 otherwise. */
  decimals?: number
  t: Strings
  language: Language
}

/**
 * The one place percentage-point changes over time are worded, in two shapes:
 * - vsPreviousYear: "up from 8.5% in 2025 (+0.2 percentage points)"
 * - sinceYear:      "+1.4 percentage points since 2017 (7.3% → 8.7%)"
 * Never writes "pts" or a bare "%" for a change — always "percentage
 * points" (or "pp" in the compact form, with the full sentence in a
 * tooltip). ▲ green / ▼ orange / – neutral throughout.
 */
export function DeltaBadge({ currentValue, compareValue, kind, compareYear, unit = '%', compact = false, decimals = 1, t, language }: DeltaBadgeProps) {
  // Rounded at the display precision: a change that shows as 0.0 / 0.00 is "no change".
  const delta = roundPct(currentValue - compareValue, decimals)
  const isUp = delta > 0
  const isDown = delta < 0
  const arrow = isUp ? '▲' : isDown ? '▼' : '–'
  const colorClass = isUp ? 'font-semibold text-green-700' : isDown ? 'font-semibold text-accent-600' : 'text-slate'

  const compareValueText = unit === '%' ? formatPct(compareValue, decimals) : `${roundPct(compareValue, decimals)}${unit}`
  const currentValueText = unit === '%' ? formatPct(currentValue, decimals) : `${roundPct(currentValue, decimals)}${unit}`
  const absDeltaText = formatPctChange(currentValue - compareValue, decimals)
  const yearText = formatYear(compareYear, language)

  let fullText: string
  if (kind === 'vsPreviousYear') {
    const verb = isUp ? t.dashboard.trend.upFrom : isDown ? t.dashboard.trend.downFrom : t.dashboard.trend.noChangeFrom
    const inYear = t.dashboard.trend.inYear.replace('{year}', yearText)
    fullText =
      arrow === '–'
        ? `${verb} ${compareValueText} ${inYear}`
        : `${verb} ${compareValueText} ${inYear} (${absDeltaText} ${t.dashboard.trend.percentagePoints})`
  } else {
    fullText =
      arrow === '–'
        ? `${t.dashboard.trend.noChangeSince.replace('{year}', yearText)} (${compareValueText} → ${currentValueText})`
        : `${absDeltaText} ${t.dashboard.trend.percentagePoints} ${t.dashboard.trend.since.replace('{year}', yearText)} (${compareValueText} → ${currentValueText})`
  }

  if (compact) {
    const compactText = arrow === '–' ? '–' : `${absDeltaText} ${t.dashboard.trend.pointsAbbrev}`
    return (
      <span className={colorClass} title={`${arrow} ${fullText}`}>
        {compactText}
      </span>
    )
  }

  return (
    <span className={colorClass}>
      {arrow} {fullText}
    </span>
  )
}

import type { Language } from '../../i18n/LanguageContext'
import type { Strings } from '../../i18n/strings'
import { formatYear } from '../../i18n/formatYear'
import { formatPct } from '../../mock/areas'
import type { Year } from '../../mock/years'

type DeltaBadgeKind = 'vsPreviousYear' | 'sinceYear' | 'vsReference'

type DeltaBadgeProps = {
  currentValue: number
  compareValue: number
  kind: DeltaBadgeKind
  /** Required for 'vsPreviousYear'/'sinceYear' (the year compareValue is from) — unused for 'vsReference'. */
  compareYear?: Year
  unit?: string
  /** Compact form for a table cell / tight column: "+0.2 pp", with the full sentence as a hover tooltip. */
  compact?: boolean
  t: Strings
  language: Language
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * The one place percentage-point changes are worded, in three shapes:
 * - vsPreviousYear: "up from 8.5% in 2025 (+0.2 percentage points)"
 * - sinceYear:      "+1.4 percentage points since 2017 (7.3% → 8.7%)"
 * - vsReference:     "+12.7 percentage points vs. reference"
 * Never writes "pts" or a bare "%" for a change — always "percentage
 * points" (or "pp" in the compact form, with the full sentence in a
 * tooltip). ▲ green / ▼ orange / – neutral throughout.
 */
export function DeltaBadge({ currentValue, compareValue, kind, compareYear, unit = '%', compact = false, t, language }: DeltaBadgeProps) {
  const delta = round1(currentValue - compareValue)
  const isUp = delta > 0.05
  const isDown = delta < -0.05
  const arrow = isUp ? '▲' : isDown ? '▼' : '–'
  const colorClass = isUp ? 'font-semibold text-green-700' : isDown ? 'font-semibold text-accent-600' : 'text-slate'

  const compareValueText = unit === '%' ? formatPct(compareValue) : `${round1(compareValue)}${unit}`
  const currentValueText = unit === '%' ? formatPct(currentValue) : `${round1(currentValue)}${unit}`
  const absDeltaText = `${isUp ? '+' : isDown ? '−' : ''}${Math.abs(delta)}`
  const yearText = compareYear !== undefined ? formatYear(compareYear, language) : ''

  let fullText: string
  if (kind === 'vsPreviousYear') {
    const verb = isUp ? t.dashboard.trend.upFrom : isDown ? t.dashboard.trend.downFrom : t.dashboard.trend.noChangeFrom
    const inYear = t.dashboard.trend.inYear.replace('{year}', yearText)
    fullText =
      arrow === '–'
        ? `${verb} ${compareValueText} ${inYear}`
        : `${verb} ${compareValueText} ${inYear} (${absDeltaText} ${t.dashboard.trend.percentagePoints})`
  } else if (kind === 'sinceYear') {
    fullText =
      arrow === '–'
        ? `${t.dashboard.trend.noChangeSince.replace('{year}', yearText)} (${compareValueText} → ${currentValueText})`
        : `${absDeltaText} ${t.dashboard.trend.percentagePoints} ${t.dashboard.trend.since.replace('{year}', yearText)} (${compareValueText} → ${currentValueText})`
  } else {
    fullText =
      arrow === '–' ? `${t.dashboard.trend.noChange} ${t.compare.vsReference}` : `${absDeltaText} ${t.dashboard.trend.percentagePoints} ${t.compare.vsReference}`
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

import { useLanguage } from '../../i18n/LanguageContext'
import { formatYear } from '../../i18n/formatYear'
import { isPendingYear } from '../../data/yearStatus'
import type { Year } from '../../mock/years'

/**
 * The empty state where a year's numbers would go: "pending registry data"
 * for a year that exists but has no population results yet (2026), otherwise
 * the plain "no data for this year". Never a 0.
 */
export function DataStateNotice({ year, className = '' }: { year: Year; className?: string }) {
  const { t, language } = useLanguage()
  const pending = isPendingYear(year)
  const yearText = formatYear(year, language)
  return (
    <div
      role="status"
      className={`rounded-lg border border-dashed p-4 text-center ${pending ? 'border-accent-500/50 bg-accent-50' : 'border-line-2'} ${className}`}
    >
      <p className="text-[13px] font-semibold text-ink">{pending ? t.common.pendingTitle : t.common.noDataTitle}</p>
      <p className="mt-1 text-[12px] text-slate">{(pending ? t.common.pendingBody : t.common.noDataBody).replaceAll('{year}', yearText)}</p>
    </div>
  )
}

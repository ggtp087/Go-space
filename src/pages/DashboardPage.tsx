import { Card } from '../components/ui/Card'
import { YearSelect } from '../components/ui/YearSelect'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'

export function DashboardPage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()

  return (
    <div className="flex-1 p-10">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold text-ink">{t.nav.dashboard}</h1>
        <YearSelect years={years} value={year} onChange={setYear} formatOption={(y) => `${t.dashboard.analysisYear} ${y}`} />
      </div>

      {/* Placeholder for the trend chart (accessibility % by year) — real chart comes once charting is wired up. */}
      <Card title={t.dashboard.trendTitle} note="Sample data" className="max-w-xl">
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-line-2 text-sm text-slate">
          {t.dashboard.trendComingSoon}
        </div>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { SidePanel } from '../components/ui/SidePanel'
import { YearSelect } from '../components/ui/YearSelect'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'

export function MapPage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-0 flex-1">
      <SidePanel title={t.map.filtersTitle} collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)}>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-slate">{t.filters.year}</label>
          <YearSelect years={years} value={year} onChange={setYear} />
        </div>
      </SidePanel>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-none p-6 pb-0">
          <h1 className="text-2xl font-bold text-ink">{t.nav.map}</h1>
        </div>
        <div className="m-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-line-2 bg-card text-sm text-slate">
          {t.map.mapPlaceholder}
        </div>
      </div>
    </div>
  )
}

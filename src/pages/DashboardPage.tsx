import { useState, type ReactNode } from 'react'
import { Card } from '../components/ui/Card'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { KpiCard } from '../components/ui/KpiCard'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { YearSelect } from '../components/ui/YearSelect'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'
import { getKpisForYear } from '../mock/kpis'
import {
  accessibilityColor,
  getAccessibilityBrackets,
  getDistrictRowsForYear,
  sampleDistrictOptions,
  type DistrictRow,
} from '../mock/districts'

const KPI_ICONS: Record<string, ReactNode> = {
  accessibility: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a13 13 0 0 0 0 18a13 13 0 0 0 0-18z" />
    </svg>
  ),
  covered: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.8-6 5.5-6s5.5 2.5 5.5 6" />
    </svg>
  ),
  notCovered: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  spaces: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <circle cx="12" cy="9" r="6" />
      <line x1="12" y1="15" x2="12" y2="21" />
    </svg>
  ),
  opsShare: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <line x1="8" y1="8" x2="12" y2="8" />
    </svg>
  ),
}

export function DashboardPage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()

  const [adminLevel, setAdminLevel] = useState<'district' | 'sub-district'>('district')
  const [areaFilter, setAreaFilter] = useState('all')

  const allRows = getDistrictRowsForYear(year)
  const filteredRows = areaFilter === 'all' ? allRows : allRows.filter((row) => row.id === areaFilter)
  const kpis = getKpisForYear(year)
  const brackets = getAccessibilityBrackets(allRows)

  const rankedRows = [...allRows].sort((a, b) => b.accessibilityPct - a.accessibilityPct)
  const highestRows = rankedRows.slice(0, 3)
  const lowestRows = rankedRows.slice(-3)

  const areaOptions = [{ value: 'all', label: t.dashboard.areaSelectAllLabel }, ...sampleDistrictOptions]

  const columns: DataTableColumn<DistrictRow>[] = [
    { key: 'name', header: t.dashboard.columns.district, render: (row) => <span className="font-semibold">{row.name}</span> },
    {
      key: 'population',
      header: t.dashboard.columns.population,
      sortable: true,
      align: 'right',
      render: (row) => row.population.toLocaleString(),
    },
    {
      key: 'accessibilityPct',
      header: t.dashboard.columns.accessibility,
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-bg">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${row.accessibilityPct}%`, background: accessibilityColor(row.accessibilityPct) }}
            />
          </div>
          <span className="tabular-nums">{row.accessibilityPct}%</span>
        </div>
      ),
    },
    { key: 'openSpaces', header: t.dashboard.columns.openSpaces, sortable: true, align: 'right' },
    {
      key: 'opsSharePct',
      header: t.dashboard.columns.opsShare,
      sortable: true,
      align: 'right',
      render: (row) => `${row.opsSharePct}%`,
    },
  ]

  return (
    <div className="flex-1 overflow-auto p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t.dashboard.pageTitle}</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-slate">{t.dashboard.pageSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            value={adminLevel}
            onChange={(value) => setAdminLevel(value as 'district' | 'sub-district')}
            options={[
              { value: 'district', label: t.adminLevel.district },
              { value: 'sub-district', label: t.adminLevel.subDistrict },
            ]}
          />
          <Select options={areaOptions} value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="w-44" />
          <YearSelect years={years} value={year} onChange={setYear} formatOption={(y) => `${t.dashboard.analysisYear} ${y}`} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} icon={KPI_ICONS[kpi.id]} value={kpi.value} label={kpi.label} tone={kpi.tone} />
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title={t.dashboard.byDistrictCardTitle} note={t.common.sampleDataTag}>
          <div className="flex gap-[18px]">
            <div className="flex h-[220px] w-[220px] flex-none items-center justify-center rounded-lg border border-dashed border-line-2 text-center text-xs text-slate">
              {t.map.mapPlaceholder}
            </div>
            <div className="flex-1">
              {brackets.map((bracket) => (
                <div key={bracket.label} className="flex items-center gap-[9px] py-[5px] text-[12.5px] text-slate">
                  <span className="h-[13px] w-[13px] flex-none rounded-[3px]" style={{ background: bracket.color }} />
                  {bracket.label} {t.dashboard.bracketAccessibilitySuffix}
                  <b className="ml-auto font-bold text-ink">
                    {bracket.count} {t.dashboard.bracketCountSuffix}
                  </b>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title={t.dashboard.rankingCardTitle} note={t.common.sampleDataTag}>
          {highestRows.map((row) => (
            <RankingRow key={row.id} row={row} />
          ))}
          <div className="py-1 text-center text-xs tracking-[2px] text-mist">···</div>
          {lowestRows.map((row) => (
            <RankingRow key={row.id} row={row} />
          ))}
        </Card>
      </div>

      <Card title={t.dashboard.tableCardTitle} note={t.common.sampleDataTag}>
        <DataTable
          columns={columns}
          rows={filteredRows}
          getRowId={(row) => row.id}
          defaultSortKey="accessibilityPct"
          footer={
            <>
              <span>{t.dashboard.tableFooter.replace('{shown}', String(filteredRows.length)).replace('{total}', String(allRows.length))}</span>
              <span>{t.common.sampleDataTag}</span>
            </>
          }
        />
      </Card>
    </div>
  )
}

function RankingRow({ row }: { row: DistrictRow }) {
  return (
    <div className="grid grid-cols-[100px_1fr_44px] items-center gap-2.5 py-[6px]">
      <span className="truncate text-[12.5px] font-semibold text-ink">{row.name}</span>
      <div className="h-4 rounded-[5px] bg-bg">
        <div className="h-4 rounded-[5px]" style={{ width: `${row.accessibilityPct}%`, background: accessibilityColor(row.accessibilityPct) }} />
      </div>
      <span className="text-right text-xs font-bold text-ink tabular-nums">{row.accessibilityPct}%</span>
    </div>
  )
}

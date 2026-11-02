import { useMemo, useState, type ReactNode } from 'react'
import { Card } from '../components/ui/Card'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { Input } from '../components/ui/Input'
import { KpiCard } from '../components/ui/KpiCard'
import { Select } from '../components/ui/Select'
import { YearSelect } from '../components/ui/YearSelect'
import { AccessibilityChoropleth } from '../components/dashboard/AccessibilityChoropleth'
import { AccessShareScatter } from '../components/dashboard/AccessShareScatter'
import { CoverageStackedBar } from '../components/dashboard/CoverageStackedBar'
import { DeltaBadge } from '../components/dashboard/DeltaBadge'
import { DeltaBarChart } from '../components/dashboard/DeltaBarChart'
import { RankingBarChart } from '../components/dashboard/RankingBarChart'
import { Sparkline } from '../components/dashboard/Sparkline'
import { TrendChart, type TrendChartPoint } from '../components/dashboard/TrendChart'
import { computeTrendYAxis } from '../components/dashboard/trendAxis'
import type { Language } from '../i18n/LanguageContext'
import { useLanguage } from '../i18n/LanguageContext'
import type { Strings } from '../i18n/strings'
import { useYear } from '../state/YearContext'
import { useArea } from '../state/AreaContext'
import { accessibilityColor, getAccessibilityBrackets, roundPct } from '../mock/areas'
import type { KpiSample } from '../mock/kpis'
import { availableYears, type Year } from '../mock/years'
import {
  BANGKOK_AREA_ID,
  getAllSubDistrictOptions,
  getAreaMeta,
  getAreaRow,
  getChildAreaRows,
  getDistrictOptions,
  getMetricSeries,
  totalOpsCount,
  type AreaRow,
} from '../mock/assessmentResults'

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

/** The 5 KPI cards for one area/year — "citywide" only for Bangkok-wide, otherwise named after the focus area, so the wording always matches what's actually being shown. */
function buildKpis(row: AreaRow, areaName: string, isWholeCity: boolean, t: Strings): KpiSample[] {
  const scope = isWholeCity ? t.dashboard.kpi.scopeCitywide : t.dashboard.kpi.scopeInArea.replace('{area}', areaName)
  const totalPopulation = Math.round(row.total_population)
  const covered = Math.round(row.population_with_access)
  const notCovered = totalPopulation - covered

  return [
    { id: 'accessibility', value: `${Math.round(row.access_pct)}%`, label: `${t.dashboard.kpi.accessibility}, ${scope}`, tone: 'green' },
    { id: 'covered', value: covered.toLocaleString(), label: `${t.dashboard.kpi.covered}, ${scope}`, tone: 'green' },
    { id: 'notCovered', value: notCovered.toLocaleString(), label: `${t.dashboard.kpi.notCovered}, ${scope}`, tone: 'amber' },
    { id: 'spaces', value: totalOpsCount(row.ops_count).toLocaleString(), label: `${t.dashboard.kpi.spaces}, ${scope}`, tone: 'green' },
    { id: 'opsShare', value: `${roundPct(row.share_ops_pct)}%`, label: `${t.dashboard.kpi.opsShare}, ${scope}`, tone: 'green' },
  ]
}

type TrendSummary = {
  currentValue: number | null
  isFirstYear: boolean
  previousValue: number | null
  previousYear: Year
  firstValue: number | null
  firstYear: Year
}

function computeTrendSummary(points: TrendChartPoint[], selectedYear: Year): TrendSummary {
  const index = points.findIndex((p) => p.year === selectedYear)
  const currentValue = index >= 0 ? points[index].value : null
  const isFirstYear = index === 0
  return {
    currentValue,
    isFirstYear,
    previousValue: index > 0 ? points[index - 1].value : null,
    previousYear: index > 0 ? points[index - 1].year : selectedYear,
    firstValue: points[0]?.value ?? null,
    firstYear: points[0]?.year ?? selectedYear,
  }
}

function TrendSummaryHeader({
  heading,
  points,
  selectedYear,
  t,
  language,
  unit = '%',
}: {
  heading: string
  points: TrendChartPoint[]
  selectedYear: Year
  t: Strings
  language: Language
  unit?: string
}) {
  const summary = computeTrendSummary(points, selectedYear)
  return (
    <div className="mb-1.5 flex items-start justify-between gap-3">
      <p className="text-[12.5px] font-semibold text-ink">{heading}</p>
      <div className="text-right text-[11px] leading-[1.5]">
        <div className="text-[15px] font-bold text-ink">
          {summary.currentValue !== null ? `${roundPct(summary.currentValue)}${unit}` : '—'}
        </div>
        {summary.isFirstYear ? (
          <div className="text-slate">{t.dashboard.trend.firstYearOfData}</div>
        ) : (
          summary.currentValue !== null &&
          summary.previousValue !== null && (
            <DeltaBadge
              currentValue={summary.currentValue}
              compareValue={summary.previousValue}
              kind="vsPreviousYear"
              compareYear={summary.previousYear}
              t={t}
              language={language}
            />
          )
        )}
        {!summary.isFirstYear && summary.currentValue !== null && summary.firstValue !== null && (
          <div>
            <DeltaBadge
              currentValue={summary.currentValue}
              compareValue={summary.firstValue}
              kind="sinceYear"
              compareYear={summary.firstYear}
              t={t}
              language={language}
            />
          </div>
        )}
      </div>
    </div>
  )
}

type SortKey = 'access_pct' | 'share_ops_pct' | 'total_population' | 'population_with_access' | 'name'
type Limit = '5' | '10' | 'all'
type Order = 'desc' | 'asc'

function sortValueFor(row: AreaRow, key: SortKey): string | number {
  switch (key) {
    case 'access_pct':
      return row.access_pct
    case 'share_ops_pct':
      return row.share_ops_pct
    case 'total_population':
      return row.total_population
    case 'population_with_access':
      return row.population_with_access
    case 'name':
      return row.name
  }
}

// Same sort algorithm as DataTable's own internal sort, so a chart driven by
// this and a DataTable driven by the matching controlled sortKey/sortDir
// always agree on row order.
function sortRows(rows: AreaRow[], key: SortKey, dir: Order): AreaRow[] {
  const sorted = [...rows].sort((a, b) => {
    const av = sortValueFor(a, key)
    const bv = sortValueFor(b, key)
    return typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function DashboardPage() {
  const { t, language } = useLanguage()
  const { year, setYear, years } = useYear()
  const { districtId, setDistrictId, subDistrictId, setSubDistrictId } = useArea()

  const isWholeCity = districtId === 'all'

  // "All districts" → Bangkok-wide; a sub-district if one's picked, else the
  // district if one's picked, else Bangkok again — same rule the Map page
  // uses for its own focus area, via the same roll-up function.
  const focusAreaId = isWholeCity ? BANGKOK_AREA_ID : subDistrictId !== 'all' ? subDistrictId : districtId
  const focusMeta = getAreaMeta(focusAreaId)
  const focusRow = getAreaRow(focusAreaId, year)
  const districtMeta = !isWholeCity ? getAreaMeta(districtId) : undefined
  const districtName = districtMeta?.name ?? ''

  // The one scoped list every other card below reads from: every district,
  // or (once a district is picked) just that district's own sub-districts —
  // never all ~48 sub-districts citywide.
  const scopedRows = useMemo(() => getChildAreaRows(districtId, year), [districtId, year])
  const previousYear = (year - 1) as Year
  const hasPreviousYear = (availableYears as readonly number[]).includes(previousYear)
  const previousFocusRow = hasPreviousYear ? getAreaRow(focusAreaId, previousYear) : undefined
  const previousScopedRowsById = useMemo(() => {
    if (!hasPreviousYear) return new Map<string, AreaRow>()
    return new Map(getChildAreaRows(districtId, previousYear).map((row) => [row.id, row]))
  }, [districtId, previousYear, hasPreviousYear])

  const brackets = getAccessibilityBrackets(scopedRows.map((row) => row.access_pct))

  // The one area a chart/table row can be highlighted for — only meaningful
  // once a specific sub-district is picked within a district.
  const selectedId = !isWholeCity && subDistrictId !== 'all' ? subDistrictId : undefined

  const districtOptions = useMemo(
    () => [{ value: 'all', label: t.dashboard.areaSelectAllLabel }, ...getDistrictOptions()],
    [t.dashboard.areaSelectAllLabel],
  )
  const subDistrictOptions = useMemo(
    () => [
      { value: 'all', label: t.filters.allSubDistricts },
      ...getAllSubDistrictOptions().filter((option) => option.parentId === districtId),
    ],
    [districtId, t.filters.allSubDistricts],
  )

  const trendAccessSeries = getMetricSeries(focusAreaId, 'access_pct')
  const trendShareSeries = getMetricSeries(focusAreaId, 'share_ops_pct')
  const accessAxis = useMemo(
    () => computeTrendYAxis(trendAccessSeries.map((point) => point.value)),
    [trendAccessSeries],
  )
  const shareAxis = useMemo(
    () => computeTrendYAxis(trendShareSeries.map((point) => point.value)),
    [trendShareSeries],
  )
  const kpis = focusRow ? buildKpis(focusRow, focusMeta?.name ?? '', isWholeCity, t) : []

  function kpiExtra(kpiId: string): ReactNode {
    if (!focusRow || !previousFocusRow) return undefined
    if (kpiId === 'accessibility') {
      return (
        <DeltaBadge
          currentValue={focusRow.access_pct}
          compareValue={previousFocusRow.access_pct}
          kind="vsPreviousYear"
          compareYear={previousYear}
          compact
          t={t}
          language={language}
        />
      )
    }
    if (kpiId === 'opsShare') {
      return (
        <DeltaBadge
          currentValue={focusRow.share_ops_pct}
          compareValue={previousFocusRow.share_ops_pct}
          kind="vsPreviousYear"
          compareYear={previousYear}
          compact
          t={t}
          language={language}
        />
      )
    }
    return undefined
  }

  function unitSuffix(count: number): string {
    if (isWholeCity) return count === 1 ? t.dashboard.bracketCountSuffixSingular : t.dashboard.bracketCountSuffix
    return count === 1 ? t.dashboard.bracketCountSuffixSubDistrictSingular : t.dashboard.bracketCountSuffixSubDistrict
  }

  const byDistrictTitle = isWholeCity
    ? t.dashboard.byDistrictCardTitle
    : t.dashboard.byDistrictCardTitleSubDistrictOf.replace('{district}', districtName)
  const rankingSubtitle = isWholeCity ? t.dashboard.charts.rankingSubtitle : t.dashboard.charts.rankingSubtitleSubDistrict
  const tableTitle = isWholeCity ? t.dashboard.tableCardTitle : t.dashboard.tableCardTitleSubDistrictOf.replace('{district}', districtName)
  const tableFooterTemplate = isWholeCity ? t.dashboard.tableFooter : t.dashboard.tableFooterSubDistrict

  // --- Control bar: one shared limit/sort/search driving the ranking
  // chart, the stacked bar, and the table — the scatter always plots every
  // row in scope and just highlights whichever of these are in the result.
  const [limit, setLimit] = useState<Limit>('10')
  const [sortBy, setSortBy] = useState<SortKey>('access_pct')
  const [order, setOrder] = useState<Order>('desc')
  const [search, setSearch] = useState('')

  const limitOptions = [
    { value: '5', label: t.dashboard.controlBar.limitTop5 },
    { value: '10', label: t.dashboard.controlBar.limitTop10 },
    { value: 'all', label: t.dashboard.controlBar.limitAll },
  ]
  const sortOptions = [
    { value: 'access_pct', label: t.dashboard.controlBar.sortAccessibility },
    { value: 'share_ops_pct', label: t.dashboard.controlBar.sortOpsShare },
    { value: 'total_population', label: t.dashboard.controlBar.sortPopulation },
    { value: 'population_with_access', label: t.dashboard.controlBar.sortCoveredPopulation },
    { value: 'name', label: t.dashboard.controlBar.sortName },
  ]
  const orderOptions = [
    { value: 'desc', label: t.dashboard.controlBar.orderHighestFirst },
    { value: 'asc', label: t.dashboard.controlBar.orderLowestFirst },
  ]

  // Area names are English-only in this dataset (no Thai names exist for
  // districts/sub-districts yet), so the search matches the one name there
  // is, in either language mode.
  const searchedRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? scopedRows.filter((row) => row.name.toLowerCase().includes(query)) : scopedRows
  }, [scopedRows, search])
  const sortedRows = useMemo(() => sortRows(searchedRows, sortBy, order), [searchedRows, sortBy, order])
  const limitedRows = useMemo(() => (limit === 'all' ? sortedRows : sortedRows.slice(0, Number(limit))), [sortedRows, limit])
  const highlightIds = useMemo(() => new Set(limitedRows.map((row) => row.id)), [limitedRows])
  const hasSearchResults = searchedRows.length > 0
  const noMatchesMessage = t.dashboard.controlBar.noMatches.replace('{query}', search)

  const columns: DataTableColumn<AreaRow>[] = [
    {
      key: 'name',
      header: isWholeCity ? t.dashboard.columns.district : t.dashboard.columns.subDistrict,
      sortable: true,
      render: (row) => <span className="font-semibold">{row.name}</span>,
    },
    {
      key: 'total_population',
      header: t.dashboard.columns.population,
      sortable: true,
      align: 'right',
      render: (row) => Math.round(row.total_population).toLocaleString(),
    },
    {
      key: 'population_with_access',
      header: t.map.coveredLabel,
      sortable: true,
      align: 'right',
      render: (row) => Math.round(row.population_with_access).toLocaleString(),
    },
    {
      key: 'access_pct',
      header: t.dashboard.columns.accessibility,
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-bg">
            <div className="h-1.5 rounded-full" style={{ width: `${row.access_pct}%`, background: accessibilityColor(row.access_pct) }} />
          </div>
          <span className="tabular-nums">{Math.round(row.access_pct)}%</span>
        </div>
      ),
    },
    {
      key: 'deltaAccessibility',
      header: t.dashboard.columns.deltaAccessibility,
      render: (row) => {
        const prev = previousScopedRowsById.get(row.id)
        return prev ? (
          <DeltaBadge currentValue={row.access_pct} compareValue={prev.access_pct} kind="vsPreviousYear" compareYear={previousYear} compact t={t} language={language} />
        ) : (
          <span className="text-mist">—</span>
        )
      },
    },
    {
      key: 'trend',
      header: t.dashboard.columns.trend,
      responsiveHide: 'lg',
      render: (row) => <Sparkline points={getMetricSeries(row.id, 'access_pct')} selectedYear={year} />,
    },
    {
      key: 'openSpaces',
      header: t.dashboard.columns.openSpaces,
      align: 'right',
      render: (row) => totalOpsCount(row.ops_count),
    },
    {
      key: 'opsAreaHa',
      header: t.dashboard.columns.opsAreaHa,
      align: 'right',
      responsiveHide: 'md',
      render: (row) => roundPct(row.ops_area_sqm / 10_000),
    },
    {
      key: 'share_ops_pct',
      header: t.dashboard.columns.opsShare,
      sortable: true,
      align: 'right',
      render: (row) => `${roundPct(row.share_ops_pct)}%`,
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
          <Select options={districtOptions} value={districtId} onChange={(event) => setDistrictId(event.target.value)} className="w-44" />
          <Select
            options={subDistrictOptions}
            value={subDistrictId}
            onChange={(event) => setSubDistrictId(event.target.value)}
            disabled={isWholeCity}
            className="w-44"
          />
          <YearSelect years={years} value={year} onChange={setYear} formatOption={(y) => `${t.dashboard.analysisYear} ${y}`} />
        </div>
      </div>

      {!focusRow ? (
        <div className="rounded-lg border border-dashed border-line-2 p-4 text-center">
          <p className="text-[13px] font-semibold text-ink">{t.common.noDataTitle}</p>
          <p className="mt-1 text-[12px] text-slate">{t.common.noDataBody.replace('{year}', String(year))}</p>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-[15px] font-bold text-ink">{t.dashboard.sections.overview}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.id} icon={KPI_ICONS[kpi.id]} value={kpi.value} label={kpi.label} tone={kpi.tone} extra={kpiExtra(kpi.id)} />
            ))}
          </div>
          <p className="mb-10 mt-2 text-[11px] text-mist">{t.dashboard.populationFootnote}</p>

          <h2 className="mb-3 text-[15px] font-bold text-ink">{t.dashboard.sections.trends}</h2>
          <div className="mb-10 grid gap-6 sm:grid-cols-2">
            <Card title={t.dashboard.charts.accessibilityTrendTitle} subtitle={t.dashboard.charts.accessibilityTrendSubtitle} note={t.common.sampleDataTag}>
              <TrendSummaryHeader heading={t.compare.metricAccessibility} points={trendAccessSeries} selectedYear={year} t={t} language={language} />
              <TrendChart
                points={trendAccessSeries}
                selectedYears={[year]}
                yMin={accessAxis.min}
                yMax={accessAxis.max}
                yTicks={accessAxis.ticks}
                color="var(--color-green-600)"
                axisNote={t.dashboard.trend.axisNote}
              />
              <p className="mb-1 mt-5 text-[12.5px] font-semibold text-ink">{t.dashboard.charts.accessibilityChangePerYearTitle}</p>
              <p className="mb-2 text-[11px] text-slate">{t.dashboard.charts.accessibilityChangePerYearSubtitle}</p>
              <DeltaBarChart points={trendAccessSeries} />
            </Card>
            <Card title={t.dashboard.charts.opsShareTrendTitle} subtitle={t.dashboard.charts.opsShareTrendSubtitle} note={t.common.sampleDataTag}>
              <TrendSummaryHeader heading={t.map.openSpaceShareLabel} points={trendShareSeries} selectedYear={year} t={t} language={language} />
              <TrendChart
                points={trendShareSeries}
                selectedYears={[year]}
                yMin={shareAxis.min}
                yMax={shareAxis.max}
                yTicks={shareAxis.ticks}
                color="var(--color-accent-600)"
                axisNote={t.dashboard.trend.axisNote}
              />
              <p className="mb-1 mt-5 text-[12.5px] font-semibold text-ink">{t.dashboard.charts.opsShareChangePerYearTitle}</p>
              <p className="mb-2 text-[11px] text-slate">{t.dashboard.charts.opsShareChangePerYearSubtitle}</p>
              <DeltaBarChart points={trendShareSeries} />
            </Card>
          </div>

          <div className="mb-6 flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-card p-4">
            <Select label={t.dashboard.controlBar.limitLabel} options={limitOptions} value={limit} onChange={(e) => setLimit(e.target.value as Limit)} className="w-28" />
            <Select
              label={t.dashboard.controlBar.sortByLabel}
              options={sortOptions}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-44"
            />
            <Select label={t.dashboard.controlBar.orderLabel} options={orderOptions} value={order} onChange={(e) => setOrder(e.target.value as Order)} className="w-36" />
            <Input
              placeholder={t.dashboard.controlBar.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[200px] flex-1"
            />
          </div>

          <h2 className="mb-3 text-[15px] font-bold text-ink">{t.dashboard.sections.rankings}</h2>
          {!hasSearchResults ? (
            <p className="mb-10 rounded-lg border border-dashed border-line-2 p-4 text-center text-[13px] text-slate">{noMatchesMessage}</p>
          ) : (
            <div className="mb-10 grid gap-6 lg:grid-cols-2">
              <Card title={byDistrictTitle} subtitle={t.dashboard.byDistrictCardSubtitle} note={t.common.sampleDataTag}>
                <div className="flex gap-[18px]">
                  <AccessibilityChoropleth
                    districtId={districtId}
                    subDistrictId={subDistrictId}
                    year={year}
                    className="h-[220px] w-[220px] flex-none"
                  />
                  <div className="flex-1">
                    {brackets.map((bracket) => (
                      <div key={bracket.label} className="flex items-center gap-[9px] py-[5px] text-[12.5px] text-slate">
                        <span className="h-[13px] w-[13px] flex-none rounded-[3px]" style={{ background: bracket.color }} />
                        {bracket.label} {t.dashboard.bracketAccessibilitySuffix}
                        <b className="ml-auto font-bold text-ink">
                          {bracket.count} {unitSuffix(bracket.count)}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title={t.dashboard.charts.rankingTitle} subtitle={rankingSubtitle} note={t.common.sampleDataTag}>
                <RankingBarChart rows={limitedRows} selectedId={selectedId} />
              </Card>

              <Card
                className="lg:col-span-2"
                title={t.dashboard.charts.coverageTitle}
                subtitle={t.dashboard.charts.coverageSubtitle}
                note={t.common.sampleDataTag}
              >
                <CoverageStackedBar
                  rows={limitedRows}
                  selectedId={selectedId}
                  coveredLabel={t.dashboard.charts.coveredLabel}
                  notCoveredLabel={t.dashboard.charts.notCoveredLabel}
                />
              </Card>
            </div>
          )}

          <h2 className="mb-3 text-[15px] font-bold text-ink">{t.dashboard.sections.relationships}</h2>
          <Card className="mb-10" title={t.dashboard.charts.scatterTitle} subtitle={t.dashboard.charts.scatterSubtitle} note={t.common.sampleDataTag}>
            <AccessShareScatter
              rows={scopedRows}
              highlightIds={highlightIds}
              selectedId={selectedId}
              quadrantLabels={{
                highHigh: t.dashboard.charts.scatterQuadrantHighHigh,
                highLow: t.dashboard.charts.scatterQuadrantHighLow,
                lowHigh: t.dashboard.charts.scatterQuadrantLowHigh,
                lowLow: t.dashboard.charts.scatterQuadrantLowLow,
              }}
              axisLabels={{ x: t.dashboard.charts.scatterAxisOpsShare, y: t.dashboard.charts.scatterAxisAccessibility }}
              populationLabel={t.dashboard.charts.scatterPopulationLabel}
            />
          </Card>

          <h2 className="mb-3 text-[15px] font-bold text-ink">{t.dashboard.sections.dataTable}</h2>
          <Card title={tableTitle} subtitle={t.dashboard.tableCardSubtitle} note={t.common.sampleDataTag}>
            {!hasSearchResults ? (
              <p className="p-4 text-center text-[13px] text-slate">{noMatchesMessage}</p>
            ) : (
              <DataTable
                columns={columns}
                rows={limitedRows}
                getRowId={(row) => row.id}
                sortKey={sortBy}
                sortDir={order}
                onSortChange={(key, dir) => {
                  setSortBy(key as SortKey)
                  setOrder(dir)
                }}
                footer={
                  <>
                    <span>{tableFooterTemplate.replace('{shown}', String(limitedRows.length)).replace('{total}', String(scopedRows.length))}</span>
                    <span>{t.common.sampleDataTag}</span>
                  </>
                }
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

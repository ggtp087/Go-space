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
import { formatYear } from '../i18n/formatYear'
import { formatAreaSqKm } from '../i18n/formatArea'
import type { Language } from '../i18n/LanguageContext'
import { useLanguage } from '../i18n/LanguageContext'
import type { Strings } from '../i18n/strings'
import { useYear } from '../state/YearContext'
import { useArea } from '../state/AreaContext'
import { accessibilityColor, getAccessibilityBrackets, roundPct } from '../mock/areas'
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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.5" r="2.1" />
      <path d="M12 6.5v5" />
      <path d="M12 11.5l-3.5 7" />
      <path d="M12 11.5l3 7.5" />
      <path d="M12 8l-3.5 2.5" />
      <path d="M12 8l4 1.5" />
    </svg>
  ),
  covered: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.8-6 5.5-6s5.5 2.5 5.5 6" />
      <path d="M16 8.5l2 2 3.5-4" />
    </svg>
  ),
  notCovered: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.8-6 5.5-6s5.5 2.5 5.5 6" />
      <path d="M16.5 6.5l4 4" />
      <path d="M20.5 6.5l-4 4" />
    </svg>
  ),
  spaces: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="4.5" />
      <line x1="9" y1="12.5" x2="9" y2="20" />
      <circle cx="16" cy="11" r="3.2" />
      <line x1="16" y1="14.2" x2="16" y2="20" />
    </svg>
  ),
  opsShare: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
}

type KpiCardConfig = {
  id: 'accessibility' | 'covered' | 'notCovered' | 'spaces' | 'opsShare'
  value: string
  heading: string
  description: string
  tone: 'green' | 'amber'
  tag?: string
}

/** The 5 KPI cards for the current focus area/year — heading+description are now static per-id copy (no embedded scope; the scope is shown once above the grid instead), so building this is just picking the right value out of the row. */
function buildKpis(row: AreaRow, t: Strings): KpiCardConfig[] {
  const totalPopulation = Math.round(row.total_population)
  const covered = Math.round(row.population_with_access)
  const notCovered = totalPopulation - covered

  return [
    {
      id: 'accessibility',
      value: `${roundPct(row.access_pct)}%`,
      heading: t.dashboard.kpi.accessibilityHeading,
      description: t.dashboard.kpi.accessibilityDescription,
      tone: 'green',
      tag: t.dashboard.kpi.sdgTag,
    },
    {
      id: 'covered',
      value: covered.toLocaleString(),
      heading: t.dashboard.kpi.coveredHeading,
      description: t.dashboard.kpi.coveredDescription,
      tone: 'green',
    },
    {
      id: 'notCovered',
      value: notCovered.toLocaleString(),
      heading: t.dashboard.kpi.notCoveredHeading,
      description: t.dashboard.kpi.notCoveredDescription,
      tone: 'amber',
    },
    {
      id: 'spaces',
      value: totalOpsCount(row.ops_count).toLocaleString(),
      heading: t.dashboard.kpi.spacesHeading,
      description: t.dashboard.kpi.spacesDescription,
      tone: 'green',
    },
    {
      id: 'opsShare',
      value: `${roundPct(row.share_ops_pct)}%`,
      heading: t.dashboard.kpi.opsShareHeading,
      description: t.dashboard.kpi.opsShareDescription,
      tone: 'green',
      tag: t.dashboard.kpi.sdgTag,
    },
  ]
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * The KPI card footer: a colored arrow + "+N <unit> from <year>" sentence,
 * reusing the DeltaBadge-established arrow/color convention but in the
 * longer per-card phrasing Part 2 calls for (not DeltaBadge's own
 * percentage-only sentence shapes). `invert` flips the up=green/down=orange
 * convention for metrics where a decrease is the good direction (residents
 * without access).
 */
function kpiDeltaFooter(
  kind: 'pp' | 'people' | 'places',
  current: number,
  previous: number,
  previousYear: Year,
  invert: boolean,
  t: Strings,
  language: Language,
): ReactNode {
  const delta = kind === 'pp' ? round1(current - previous) : Math.round(current - previous)
  const isUp = delta > (kind === 'pp' ? 0.05 : 0)
  const isDown = delta < (kind === 'pp' ? -0.05 : 0)
  const arrow = isUp ? '▲' : isDown ? '▼' : '–'
  const isGood = arrow === '–' ? null : arrow === '▲' ? !invert : invert
  const colorClass = isGood === null ? 'text-slate' : isGood ? 'font-semibold text-green-700' : 'font-semibold text-accent-600'

  if (arrow === '–') {
    return <span className={colorClass}>{t.dashboard.trend.noChange}</span>
  }

  const absText = kind === 'pp' ? String(Math.abs(delta)) : Math.abs(delta).toLocaleString()
  const signedText = `${delta > 0 ? '+' : '−'}${absText}`
  const template = kind === 'pp' ? t.dashboard.kpi.deltaPercentagePoints : kind === 'people' ? t.dashboard.kpi.deltaPeople : t.dashboard.kpi.deltaPlaces
  const text = template.replace('{delta}', signedText).replace('{year}', formatYear(previousYear, language))
  return (
    <span className={colorClass}>
      {arrow} {text}
    </span>
  )
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
  const focusMeta = getAreaMeta(focusAreaId, language)
  const focusRow = getAreaRow(focusAreaId, year, language)
  const districtMeta = !isWholeCity ? getAreaMeta(districtId, language) : undefined
  const districtName = districtMeta?.name ?? ''

  // The one scoped list every other card below reads from: every district,
  // or (once a district is picked) just that district's own sub-districts —
  // never all ~48 sub-districts citywide.
  const scopedRows = useMemo(() => getChildAreaRows(districtId, year, language), [districtId, year, language])
  const previousYear = (year - 1) as Year
  const hasPreviousYear = (availableYears as readonly number[]).includes(previousYear)
  const previousFocusRow = hasPreviousYear ? getAreaRow(focusAreaId, previousYear, language) : undefined
  const previousScopedRowsById = useMemo(() => {
    if (!hasPreviousYear) return new Map<string, AreaRow>()
    return new Map(getChildAreaRows(districtId, previousYear, language).map((row) => [row.id, row]))
  }, [districtId, previousYear, hasPreviousYear, language])

  const brackets = getAccessibilityBrackets(scopedRows.map((row) => row.access_pct))

  // The one area a chart/table row can be highlighted for — only meaningful
  // once a specific sub-district is picked within a district.
  const selectedId = !isWholeCity && subDistrictId !== 'all' ? subDistrictId : undefined

  const districtOptions = useMemo(
    () => [{ value: 'all', label: t.dashboard.areaSelectAllLabel }, ...getDistrictOptions(language)],
    [t.dashboard.areaSelectAllLabel, language],
  )
  const subDistrictOptions = useMemo(
    () => [
      { value: 'all', label: t.filters.allSubDistricts },
      ...getAllSubDistrictOptions(language).filter((option) => option.parentId === districtId),
    ],
    [districtId, t.filters.allSubDistricts, language],
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
  const kpis = focusRow ? buildKpis(focusRow, t) : []
  const scopeAreaName = isWholeCity ? t.map.bangkokLabel : (focusMeta?.name ?? '')
  const scopeHeading = t.dashboard.kpi.scopeHeading.replace('{area}', scopeAreaName).replace('{year}', formatYear(year, language))

  function kpiFooter(kpiId: KpiCardConfig['id']): ReactNode {
    if (!focusRow) return undefined
    if (!hasPreviousYear || !previousFocusRow) return <span className="text-slate">{t.dashboard.trend.firstYearOfData}</span>
    switch (kpiId) {
      case 'accessibility':
        return kpiDeltaFooter('pp', focusRow.access_pct, previousFocusRow.access_pct, previousYear, false, t, language)
      case 'opsShare':
        return kpiDeltaFooter('pp', focusRow.share_ops_pct, previousFocusRow.share_ops_pct, previousYear, false, t, language)
      case 'covered':
        return kpiDeltaFooter('people', focusRow.population_with_access, previousFocusRow.population_with_access, previousYear, false, t, language)
      case 'notCovered':
        return kpiDeltaFooter(
          'people',
          focusRow.total_population - focusRow.population_with_access,
          previousFocusRow.total_population - previousFocusRow.population_with_access,
          previousYear,
          true,
          t,
          language,
        )
      case 'spaces':
        return kpiDeltaFooter('places', totalOpsCount(focusRow.ops_count), totalOpsCount(previousFocusRow.ops_count), previousYear, false, t, language)
    }
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

  // Matches an area's name in either language regardless of which one the
  // UI is currently showing — e.g. searching "เขต 3" still finds "District 3"
  // in English mode, and vice versa.
  const otherLanguage: Language = language === 'th' ? 'en' : 'th'
  const otherLanguageNameById = useMemo(() => {
    const otherRows = getChildAreaRows(districtId, year, otherLanguage)
    return new Map(otherRows.map((row) => [row.id, row.name]))
  }, [districtId, year, otherLanguage])
  const searchedRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return scopedRows
    return scopedRows.filter((row) => {
      const otherName = otherLanguageNameById.get(row.id) ?? ''
      return row.name.toLowerCase().includes(query) || otherName.toLowerCase().includes(query)
    })
  }, [scopedRows, search, otherLanguageNameById])
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
          <span className="tabular-nums">{roundPct(row.access_pct)}%</span>
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
      key: 'opsAreaKm2',
      header: t.dashboard.columns.opsAreaKm2,
      align: 'right',
      responsiveHide: 'md',
      render: (row) => formatAreaSqKm(row.ops_area_sqm, language),
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
          <YearSelect years={years} value={year} onChange={setYear} formatOption={(y) => `${t.dashboard.analysisYear} ${formatYear(y, language)}`} />
        </div>
      </div>

      {!focusRow ? (
        <div className="rounded-lg border border-dashed border-line-2 p-4 text-center">
          <p className="text-[13px] font-semibold text-ink">{t.common.noDataTitle}</p>
          <p className="mt-1 text-[12px] text-slate">{t.common.noDataBody.replace('{year}', formatYear(year, language))}</p>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-[15px] font-bold text-ink">{t.dashboard.sections.overview}</h2>
          <p className="mb-3 text-[13px] font-semibold text-slate">{scopeHeading}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                icon={KPI_ICONS[kpi.id]}
                heading={kpi.heading}
                value={kpi.value}
                description={kpi.description}
                tone={kpi.tone}
                tag={kpi.tag}
                footer={kpiFooter(kpi.id)}
              />
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
                axisNote={t.dashboard.trend.axisNote}
                language={language}
                noDataLabel={t.common.noData}
                colorBySegmentDirection
                directionNote={t.dashboard.trend.directionNote}
              />
              <p className="mb-1 mt-5 text-[12.5px] font-semibold text-ink">{t.dashboard.charts.accessibilityChangePerYearTitle}</p>
              <p className="mb-2 text-[11px] text-slate">{t.dashboard.charts.accessibilityChangePerYearSubtitle}</p>
              <DeltaBarChart points={trendAccessSeries} language={language} />
            </Card>
            <Card title={t.dashboard.charts.opsShareTrendTitle} subtitle={t.dashboard.charts.opsShareTrendSubtitle} note={t.common.sampleDataTag}>
              <TrendSummaryHeader heading={t.map.openSpaceShareLabel} points={trendShareSeries} selectedYear={year} t={t} language={language} />
              <TrendChart
                points={trendShareSeries}
                selectedYears={[year]}
                yMin={shareAxis.min}
                yMax={shareAxis.max}
                yTicks={shareAxis.ticks}
                axisNote={t.dashboard.trend.axisNote}
                language={language}
                noDataLabel={t.common.noData}
                colorBySegmentDirection
                directionNote={t.dashboard.trend.directionNote}
              />
              <p className="mb-1 mt-5 text-[12.5px] font-semibold text-ink">{t.dashboard.charts.opsShareChangePerYearTitle}</p>
              <p className="mb-2 text-[11px] text-slate">{t.dashboard.charts.opsShareChangePerYearSubtitle}</p>
              <DeltaBarChart points={trendShareSeries} language={language} />
            </Card>
          </div>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-[14px] border border-line bg-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Select label={t.dashboard.controlBar.limitLabel} options={limitOptions} value={limit} onChange={(e) => setLimit(e.target.value as Limit)} className="w-28" />
              <Select
                label={t.dashboard.controlBar.sortByLabel}
                options={sortOptions}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-44"
              />
              <Select label={t.dashboard.controlBar.orderLabel} options={orderOptions} value={order} onChange={(e) => setOrder(e.target.value as Order)} className="w-36" />
            </div>
            <Input
              placeholder={t.dashboard.controlBar.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72"
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
                  populationLabel={t.dashboard.charts.scatterPopulationLabel}
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
              medianLabelTemplate={t.dashboard.charts.scatterMedianLabel}
              axisNote={t.dashboard.trend.axisNote}
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

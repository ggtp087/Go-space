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
import { KPI_ICONS } from '../components/dashboard/kpiIcons'
import { RankingBarChart } from '../components/dashboard/RankingBarChart'
import { Sparkline } from '../components/dashboard/Sparkline'
import { TrendChart, type TrendChartPoint } from '../components/dashboard/TrendChart'
import { computeCountAxis, computeTrendYAxis, computeNiceAxis } from '../components/dashboard/trendAxis'
import { formatYear } from '../i18n/formatYear'
import { formatAreaSqKm } from '../i18n/formatArea'
import type { Language } from '../i18n/LanguageContext'
import { useLanguage } from '../i18n/LanguageContext'
import type { Strings } from '../i18n/strings'
import { useYear } from '../state/YearContext'
import { useArea } from '../state/AreaContext'
import { accessibilityColor, formatPct, getAccessibilityBrackets } from '../mock/areas'
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
      value: formatPct(row.access_pct),
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
      value: formatPct(row.share_ops_pct),
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

  const absText = kind === 'pp' ? Math.abs(delta).toFixed(1) : Math.abs(delta).toLocaleString()
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
}: {
  heading: string
  points: TrendChartPoint[]
  selectedYear: Year
  t: Strings
  language: Language
}) {
  const summary = computeTrendSummary(points, selectedYear)
  return (
    <div className="mb-1.5 flex items-start justify-between gap-3">
      <p className="text-[12.5px] font-semibold text-ink">{heading}</p>
      <div className="text-right text-[11px] leading-[1.5]">
        <div className="text-[15px] font-bold text-ink">{summary.currentValue !== null ? formatPct(summary.currentValue) : '—'}</div>
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

// The 4 measurable ranking metrics — "name" is a real sort but lives only on
// the table's own column header (see handleTableSortChange), never in the
// Metric control or the ranking chart/reference line/generated title, which
// all need an actual number to plot.
type MetricKey = 'access_pct' | 'share_ops_pct' | 'total_population' | 'population_with_access'
type SortKey = MetricKey | 'name'
type Limit = '5' | '10' | 'all'
type Order = 'desc' | 'asc'

function metricValue(row: AreaRow, metric: MetricKey): number {
  switch (metric) {
    case 'access_pct':
      return row.access_pct
    case 'share_ops_pct':
      return row.share_ops_pct
    case 'total_population':
      return row.total_population
    case 'population_with_access':
      return row.population_with_access
  }
}

function isPercentMetric(metric: MetricKey): boolean {
  return metric === 'access_pct' || metric === 'share_ops_pct'
}

// A fixed neutral slate — every metric except accessibility uses this one
// color for every bar, so a glance at a population ranking's bar color is
// never mistaken for an accessibility read (which only ever uses
// accessibilityScale's green→orange). Deliberately not comparisonPalette[0]
// or any other series color, which this chart has nothing to do with.
const NEUTRAL_METRIC_COLOR = '#64748B'

function sortValueFor(row: AreaRow, key: SortKey): string | number {
  return key === 'name' ? row.name : metricValue(row, key)
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

function metricNoun(metric: MetricKey, t: Strings): string {
  switch (metric) {
    case 'access_pct':
      return t.dashboard.rankingTitle.metricAccessibilityNoun
    case 'share_ops_pct':
      return t.dashboard.rankingTitle.metricOpsShareNoun
    case 'total_population':
      return t.dashboard.rankingTitle.metricPopulationNoun
    case 'population_with_access':
      return t.dashboard.rankingTitle.metricCoveredNoun
  }
}

/**
 * The ranking card's own title, generated from the current selection —
 * written out per language (not one template interpolated the same way
 * twice), since natural Thai word order isn't English's with the nouns
 * swapped in. Thai places "ในเขต{district}" at the very end of the counted
 * form but right after the level noun in the "all" form — both verified
 * against the advisor's own example sentences, not just translated.
 */
function generateRankingTitle(
  metric: MetricKey,
  order: Order,
  limit: Limit,
  isWholeCity: boolean,
  districtName: string,
  t: Strings,
  language: Language,
): string {
  const levelPlural = isWholeCity ? t.dashboard.bracketCountSuffix : t.dashboard.bracketCountSuffixSubDistrict
  const noun = metricNoun(metric, t)
  const isHigh = order === 'desc'
  const orderPhrase = isHigh ? t.dashboard.controlBar.orderHighestFirst : t.dashboard.controlBar.orderLowestFirst

  if (language === 'th') {
    const superlative = isPercentMetric(metric)
      ? isHigh
        ? t.dashboard.rankingTitle.superlativeHighPct
        : t.dashboard.rankingTitle.superlativeLowPct
      : isHigh
        ? t.dashboard.rankingTitle.superlativeHighCount
        : t.dashboard.rankingTitle.superlativeLowCount
    if (limit === 'all') {
      return isWholeCity
        ? `ทุก${levelPlural} เรียงตาม${noun} (${orderPhrase})`
        : `ทุก${levelPlural}ในเขต${districtName} เรียงตาม${noun} (${orderPhrase})`
    }
    return isWholeCity
      ? `${limit} ${levelPlural}ที่มี${noun}${superlative}`
      : `${limit} ${levelPlural}ที่มี${noun}${superlative}ในเขต${districtName}`
  }

  const superlative =
    metric === 'population_with_access'
      ? isHigh
        ? t.dashboard.rankingTitle.superlativeHighCovered
        : t.dashboard.rankingTitle.superlativeLowCovered
      : isHigh
        ? t.dashboard.rankingTitle.superlativeHighPct
        : t.dashboard.rankingTitle.superlativeLowPct
  if (limit === 'all') {
    return isWholeCity ? `All ${levelPlural} by ${noun} (${orderPhrase})` : `All ${levelPlural} in ${districtName} by ${noun} (${orderPhrase})`
  }
  return isWholeCity
    ? `${limit} ${levelPlural} with the ${superlative} ${noun}`
    : `${limit} ${levelPlural} in ${districtName} with the ${superlative} ${noun}`
}

/**
 * The ranking chart's reference line: the scope's own rolled-up value for
 * % metrics (never an average of each area's own percentage), but the
 * arithmetic mean per area for count metrics, where a "rolled-up" figure
 * would just be the scope's grand total — not a useful line to compare
 * individual areas against.
 */
function computeMetricReference(
  metric: MetricKey,
  scopedRows: AreaRow[],
  scopeLabel: string,
  isWholeCity: boolean,
  t: Strings,
): { value: number; label: string } {
  if (metric === 'access_pct') {
    const totalPopulation = scopedRows.reduce((sum, row) => sum + row.total_population, 0)
    const covered = scopedRows.reduce((sum, row) => sum + row.population_with_access, 0)
    const value = totalPopulation > 0 ? (covered / totalPopulation) * 100 : 0
    return { value, label: `${scopeLabel} ${formatPct(value)}` }
  }
  if (metric === 'share_ops_pct') {
    const totalArea = scopedRows.reduce((sum, row) => sum + row.total_area_sqm, 0)
    const opsArea = scopedRows.reduce((sum, row) => sum + row.ops_area_sqm, 0)
    const value = totalArea > 0 ? (opsArea / totalArea) * 100 : 0
    return { value, label: `${scopeLabel} ${formatPct(value)}` }
  }
  const sum = scopedRows.reduce((total, row) => total + (metric === 'total_population' ? row.total_population : row.population_with_access), 0)
  const value = scopedRows.length > 0 ? sum / scopedRows.length : 0
  const label = isWholeCity ? t.dashboard.rankingTitle.averagePerDistrict : t.dashboard.rankingTitle.averagePerSubDistrict
  return { value, label: `${label} ${Math.round(value).toLocaleString()}` }
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

  const brackets = getAccessibilityBrackets(scopedRows)

  // The choropleth legend's own clickable-class toggle: clicking a bracket
  // row highlights only its areas on the map (others faded); click again
  // (or change scope) to clear.
  const [activeBandLabel, setActiveBandLabel] = useState<string | null>(null)
  // Resetting state when a prop changes, done during render (not in an
  // effect) per React's own guidance — avoids an extra commit/cascading
  // render from a setState inside useEffect.
  const [lastScopeDistrictId, setLastScopeDistrictId] = useState(districtId)
  if (districtId !== lastScopeDistrictId) {
    setLastScopeDistrictId(districtId)
    setActiveBandLabel(null)
  }
  const activeBand = brackets.find((b) => b.label === activeBandLabel)
  const choroplethHighlightIds = activeBand ? new Set(activeBand.ids) : null

  // "Current scope" = Bangkok, or the selected district — the same set
  // AccessibilityChoropleth/RankingBarChart show, independent of a further
  // sub-district drill-down (which narrows `focusRow` below but not the
  // scope these two read from).
  const scopeLabel = isWholeCity ? t.map.bangkokLabel : districtName
  const scopeTotalPopulation = scopedRows.reduce((sum, row) => sum + row.total_population, 0)
  const scopeCoveredPopulation = scopedRows.reduce((sum, row) => sum + row.population_with_access, 0)
  // The roll-up of raw population, not an average of each area's own
  // access_pct — a handful of small high-access areas must not outweigh one
  // large low-access one.
  const scopeOverallAccessPct = scopeTotalPopulation > 0 ? (scopeCoveredPopulation / scopeTotalPopulation) * 100 : 0
  const sortedByAccess = useMemo(() => [...scopedRows].sort((a, b) => a.access_pct - b.access_pct), [scopedRows])
  const medianRow = sortedByAccess[Math.floor((sortedByAccess.length - 1) / 2)]
  const lowestRow = sortedByAccess[0]
  const highestRow = sortedByAccess[sortedByAccess.length - 1]

  function handleChoroplethSelect(id: string) {
    if (isWholeCity) setDistrictId(id)
    else setSubDistrictId(id)
  }

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
  const accessAxis = useMemo(() => computeTrendYAxis(trendAccessSeries.map((point) => point.value)), [trendAccessSeries])
  const shareAxis = useMemo(() => computeTrendYAxis(trendShareSeries.map((point) => point.value)), [trendShareSeries])
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
  const byDistrictSubtitle = isWholeCity
    ? t.dashboard.byDistrictCardSubtitle
    : t.dashboard.byDistrictCardSubtitleInDistrict.replace('{district}', districtName)
  const tableTitle = isWholeCity ? t.dashboard.tableCardTitle : t.dashboard.tableCardTitleSubDistrictOf.replace('{district}', districtName)
  const tableFooterTemplate = isWholeCity ? t.dashboard.tableFooter : t.dashboard.tableFooterSubDistrict

  // --- Control bar: one shared metric/order/limit/search driving the
  // ranking chart, the stacked bar, and the table — the scatter always plots
  // every row in scope and just highlights whichever of these are in the
  // result. The table's own name-column header can additionally re-sort its
  // (already metric-selected) rows by name, without touching Metric itself —
  // see handleTableSortChange.
  const [limit, setLimit] = useState<Limit>('10')
  const [metric, setMetric] = useState<MetricKey>('access_pct')
  const [order, setOrder] = useState<Order>('desc')
  const [tableNameSort, setTableNameSort] = useState(false)
  const [search, setSearch] = useState('')

  function resetControls() {
    setLimit('10')
    setMetric('access_pct')
    setOrder('desc')
    setTableNameSort(false)
    setSearch('')
  }

  const limitOptions = [
    { value: '5', label: t.dashboard.controlBar.limitTop5 },
    { value: '10', label: t.dashboard.controlBar.limitTop10 },
    { value: 'all', label: t.dashboard.controlBar.limitAll },
  ]
  const metricOptions = [
    { value: 'access_pct', label: t.dashboard.controlBar.metricAccessibility },
    { value: 'share_ops_pct', label: t.dashboard.controlBar.metricOpsShare },
    { value: 'total_population', label: t.dashboard.controlBar.metricPopulation },
    { value: 'population_with_access', label: t.dashboard.controlBar.metricCovered },
  ]
  const orderOptions = [
    { value: 'desc', label: t.dashboard.controlBar.orderHighestFirst },
    { value: 'asc', label: t.dashboard.controlBar.orderLowestFirst },
  ]

  function handleTableSortChange(key: string, dir: Order) {
    if (key === 'name') {
      setTableNameSort(true)
    } else {
      setMetric(key as MetricKey)
      setTableNameSort(false)
    }
    setOrder(dir)
  }

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
  // Row order/selection for the ranking chart, coverage chart, and table all
  // come from metric+order — the table's own name-header click (below) only
  // re-displays this same set, it never changes which rows are in it.
  const sortedRows = useMemo(() => sortRows(searchedRows, metric, order), [searchedRows, metric, order])
  const limitedRows = useMemo(() => (limit === 'all' ? sortedRows : sortedRows.slice(0, Number(limit))), [sortedRows, limit])
  const shownIds = useMemo(() => new Set(limitedRows.map((row) => row.id)), [limitedRows])
  // Outlining every single feature (the trivial "nothing's actually
  // filtered" case) would just add visual noise for no information — the
  // map only follows the selection once it's a genuine subset of the scope.
  const choroplethSelectionIds = shownIds.size < scopedRows.length ? shownIds : null
  const hasSearchResults = searchedRows.length > 0
  const noMatchesMessage = t.dashboard.controlBar.noMatches.replace('{query}', search)

  const rankingValues = limitedRows.map((row) => metricValue(row, metric))
  const rankingIsPercent = isPercentMetric(metric)
  const rankingAxis = metric === 'access_pct' ? { max: 100, ticks: [0, 25, 50, 75, 100] } : metric === 'share_ops_pct' ? computeNiceAxis(rankingValues) : computeCountAxis(rankingValues)
  const rankingFormatValue = rankingIsPercent ? formatPct : (value: number) => Math.round(value).toLocaleString()
  const rankingBarColor = metric === 'access_pct' ? accessibilityColor : () => NEUTRAL_METRIC_COLOR
  const rankingReference = computeMetricReference(metric, scopedRows, scopeLabel, isWholeCity, t)
  // A specific count that's >= the whole scope shows every area anyway — the
  // title should say so ("all"), not claim a "top 5" that's really "all 3".
  const rankingTitleLimit: Limit = limit !== 'all' && Number(limit) >= scopedRows.length ? 'all' : limit
  const rankingTitle = generateRankingTitle(metric, order, rankingTitleLimit, isWholeCity, districtName, t, language)

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
          <span className="tabular-nums">{formatPct(row.access_pct)}</span>
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
      render: (row) => formatPct(row.share_ops_pct),
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
              <Select label={t.dashboard.controlBar.limitLabel} options={limitOptions} value={limit} onChange={(e) => setLimit(e.target.value as Limit)} className="w-24" />
              <Select
                label={t.dashboard.controlBar.metricLabel}
                options={metricOptions}
                value={metric}
                onChange={(e) => {
                  setMetric(e.target.value as MetricKey)
                  setTableNameSort(false)
                }}
                className="w-56"
              />
              <Select label={t.dashboard.controlBar.orderLabel} options={orderOptions} value={order} onChange={(e) => setOrder(e.target.value as Order)} className="w-36" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12.5px] text-slate">
                {tableFooterTemplate.replace('{shown}', String(limitedRows.length)).replace('{total}', String(scopedRows.length))}
              </span>
              <button
                type="button"
                onClick={resetControls}
                className="rounded-lg border border-line bg-white px-3 py-[7px] text-[12.5px] font-semibold text-slate transition-colors hover:bg-bg"
              >
                {t.dashboard.controlBar.resetButton}
              </button>
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
            <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
              <Card className="xl:col-span-3" title={byDistrictTitle} subtitle={byDistrictSubtitle} note={t.common.sampleDataTag}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                  <AccessibilityChoropleth
                    districtId={districtId}
                    subDistrictId={subDistrictId}
                    year={year}
                    className="h-[420px] w-full lg:w-[65%]"
                    variant="plain"
                    interactive
                    onSelectArea={handleChoroplethSelect}
                    highlightIds={choroplethHighlightIds}
                    selectionIds={choroplethSelectionIds}
                    language={language}
                    peopleLabel={t.common.peopleUnit}
                  />
                  <div className="w-full lg:w-[35%]">
                    <p className="mb-1.5 text-[11.5px] font-semibold text-ink">{t.dashboard.kpi.accessibilityHeading}</p>
                    <div>
                      {brackets.map((bracket) => {
                        const isActive = bracket.label === activeBandLabel
                        return (
                          <button
                            key={bracket.label}
                            type="button"
                            onClick={() => setActiveBandLabel((current) => (current === bracket.label ? null : bracket.label))}
                            aria-pressed={isActive}
                            className={`flex w-full items-center gap-[9px] rounded-md px-1.5 py-[5px] text-left text-[12.5px] text-slate transition-colors ${
                              isActive ? 'bg-green-50 ring-1 ring-inset ring-green-600' : 'hover:bg-bg'
                            }`}
                          >
                            <span className="h-[13px] w-[13px] flex-none rounded-[3px]" style={{ background: bracket.color }} />
                            <span className="flex-1">{bracket.label}</span>
                            <span className="flex-none whitespace-nowrap text-right text-[11.5px] font-bold text-ink">
                              {bracket.count} {unitSuffix(bracket.count)} · {Math.round(bracket.population).toLocaleString()} {t.common.peopleUnit}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {scopedRows.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[11.5px] text-slate">
                        <div className="flex items-center justify-between gap-2">
                          <span>{t.dashboard.byDistrictSummary.overallLabel}</span>
                          <b className="flex-none font-bold text-ink">{formatPct(scopeOverallAccessPct)}</b>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex-none">{t.dashboard.byDistrictSummary.medianLabel}</span>
                          <span className="truncate text-right font-semibold text-ink">
                            {medianRow.name} ({formatPct(medianRow.access_pct)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex-none">{t.dashboard.byDistrictSummary.rangeLabel}</span>
                          <span className="truncate text-right font-semibold text-ink">
                            {lowestRow.name} ({formatPct(lowestRow.access_pct)}) – {highestRow.name} ({formatPct(highestRow.access_pct)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="xl:col-span-2" title={rankingTitle} note={t.common.sampleDataTag}>
                <RankingBarChart
                  rows={limitedRows.map((row) => ({ id: row.id, name: row.name, value: metricValue(row, metric) }))}
                  selectedId={selectedId}
                  axisMax={rankingAxis.max}
                  axisTicks={rankingAxis.ticks}
                  formatValue={rankingFormatValue}
                  barColor={rankingBarColor}
                  referenceValue={rankingReference.value}
                  referenceLabel={rankingReference.label}
                />
              </Card>

              <Card
                className="lg:col-span-2 xl:col-span-5"
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
              highlightIds={shownIds}
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
                sortKey={tableNameSort ? 'name' : metric}
                sortDir={order}
                onSortChange={handleTableSortChange}
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

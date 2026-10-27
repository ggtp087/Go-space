import { useMemo, type ReactNode } from 'react'
import { Card } from '../components/ui/Card'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { KpiCard } from '../components/ui/KpiCard'
import { Select } from '../components/ui/Select'
import { YearSelect } from '../components/ui/YearSelect'
import { AccessibilityChoropleth } from '../components/dashboard/AccessibilityChoropleth'
import { DeltaBadge } from '../components/dashboard/DeltaBadge'
import { Sparkline } from '../components/dashboard/Sparkline'
import { TrendChart, type TrendChartPoint } from '../components/dashboard/TrendChart'
import { computeNiceAxis } from '../components/dashboard/trendAxis'
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
  deltaVsPrevious: number | null
  deltaSince2017: number | null
}

function computeTrendSummary(points: TrendChartPoint[], selectedYear: Year): TrendSummary {
  const index = points.findIndex((p) => p.year === selectedYear)
  const currentValue = index >= 0 ? points[index].value : null
  const isFirstYear = index === 0
  const prevValue = index > 0 ? points[index - 1].value : null
  const firstValue = points[0]?.value ?? null
  return {
    currentValue,
    isFirstYear,
    deltaVsPrevious: currentValue !== null && prevValue !== null ? currentValue - prevValue : null,
    deltaSince2017: currentValue !== null && firstValue !== null && !isFirstYear ? currentValue - firstValue : null,
  }
}

function TrendSummaryHeader({
  heading,
  points,
  selectedYear,
  t,
  unit = '%',
}: {
  heading: string
  points: TrendChartPoint[]
  selectedYear: Year
  t: Strings
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
          summary.deltaVsPrevious !== null && (
            <DeltaBadge delta={summary.deltaVsPrevious} suffix={t.dashboard.trend.ptsVsPrevious} noChangeLabel={t.dashboard.trend.noChange} />
          )
        )}
        {summary.deltaSince2017 !== null && (
          <div>
            <DeltaBadge delta={summary.deltaSince2017} suffix={t.dashboard.trend.ptsSince2017} noChangeLabel={t.dashboard.trend.noChange} />
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { t } = useLanguage()
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
  const scopedRows = getChildAreaRows(districtId, year)
  const previousYear = (year - 1) as Year
  const hasPreviousYear = (availableYears as readonly number[]).includes(previousYear)
  const previousScopedRowsById = useMemo(() => {
    if (!hasPreviousYear) return new Map<string, AreaRow>()
    return new Map(getChildAreaRows(districtId, previousYear).map((row) => [row.id, row]))
  }, [districtId, previousYear, hasPreviousYear])

  const brackets = getAccessibilityBrackets(scopedRows.map((row) => row.access_pct))

  const rankedRows = [...scopedRows].sort((a, b) => b.access_pct - a.access_pct)
  const highestRows = rankedRows.slice(0, 3)
  const lowestRows = rankedRows.slice(-3)
  const selectedRank = !isWholeCity && subDistrictId !== 'all' ? rankedRows.findIndex((row) => row.id === subDistrictId) + 1 : 0
  const selectedRow = selectedRank > 0 ? rankedRows[selectedRank - 1] : undefined
  const selectedAlreadyShown = Boolean(selectedRow) && (highestRows.includes(selectedRow!) || lowestRows.includes(selectedRow!))

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
  const shareAxis = useMemo(
    () => computeNiceAxis(trendShareSeries.map((point) => point.value).filter((value): value is number => value !== null)),
    [trendShareSeries],
  )
  const kpis = focusRow ? buildKpis(focusRow, focusMeta?.name ?? '', isWholeCity, t) : []

  function unitSuffix(count: number): string {
    if (isWholeCity) return count === 1 ? t.dashboard.bracketCountSuffixSingular : t.dashboard.bracketCountSuffix
    return count === 1 ? t.dashboard.bracketCountSuffixSubDistrictSingular : t.dashboard.bracketCountSuffixSubDistrict
  }

  const byDistrictTitle = isWholeCity
    ? t.dashboard.byDistrictCardTitle
    : t.dashboard.byDistrictCardTitleSubDistrictOf.replace('{district}', districtName)
  const rankingTitle = isWholeCity
    ? t.dashboard.rankingCardTitle
    : t.dashboard.rankingCardTitleSubDistrictOf.replace('{district}', districtName)
  const tableTitle = isWholeCity ? t.dashboard.tableCardTitle : t.dashboard.tableCardTitleSubDistrictOf.replace('{district}', districtName)
  const tableFooterTemplate = isWholeCity ? t.dashboard.tableFooter : t.dashboard.tableFooterSubDistrict

  const columns: DataTableColumn<AreaRow>[] = [
    {
      key: 'name',
      header: isWholeCity ? t.dashboard.columns.district : t.dashboard.columns.subDistrict,
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
      sortable: true,
      align: 'right',
      sortValue: (row) => {
        const prev = previousScopedRowsById.get(row.id)
        return prev ? row.access_pct - prev.access_pct : 0
      },
      render: (row) => {
        const prev = previousScopedRowsById.get(row.id)
        return prev ? (
          <DeltaBadge delta={row.access_pct - prev.access_pct} noChangeLabel={t.dashboard.trend.noChange} compact />
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
      sortable: true,
      align: 'right',
      sortValue: (row) => totalOpsCount(row.ops_count),
      render: (row) => totalOpsCount(row.ops_count),
    },
    {
      key: 'opsAreaHa',
      header: t.dashboard.columns.opsAreaHa,
      sortable: true,
      align: 'right',
      responsiveHide: 'md',
      sortValue: (row) => row.ops_area_sqm / 10_000,
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.id} icon={KPI_ICONS[kpi.id]} value={kpi.value} label={kpi.label} tone={kpi.tone} />
            ))}
          </div>
          <p className="mb-6 mt-2 text-[11px] text-mist">{t.dashboard.populationFootnote}</p>

          <Card className="mb-6" title={t.dashboard.trendCardTitle} note={t.common.sampleDataTag}>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <TrendSummaryHeader heading={t.compare.metricAccessibility} points={trendAccessSeries} selectedYear={year} t={t} />
                <TrendChart
                  points={trendAccessSeries}
                  selectedYears={[year]}
                  yMax={100}
                  yTicks={[0, 25, 50, 75, 100]}
                  color="var(--color-green-600)"
                />
              </div>
              <div>
                <TrendSummaryHeader heading={t.map.openSpaceShareLabel} points={trendShareSeries} selectedYear={year} t={t} />
                <TrendChart
                  points={trendShareSeries}
                  selectedYears={[year]}
                  yMax={shareAxis.max}
                  yTicks={shareAxis.ticks}
                  color="var(--color-accent-600)"
                />
              </div>
            </div>
          </Card>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card title={byDistrictTitle} note={t.common.sampleDataTag}>
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

            <Card title={rankingTitle} note={t.common.sampleDataTag}>
              {highestRows.map((row) => (
                <RankingRow key={row.id} row={row} selected={row.id === subDistrictId} />
              ))}
              <div className="py-1 text-center text-xs tracking-[2px] text-mist">···</div>
              {lowestRows.map((row) => (
                <RankingRow key={row.id} row={row} selected={row.id === subDistrictId} />
              ))}
              {selectedRow && !selectedAlreadyShown && (
                <>
                  <div className="py-1 text-center text-xs tracking-[2px] text-mist">···</div>
                  <p className="pb-1 text-center text-[11px] text-slate">
                    {t.dashboard.rankSelectedLabel
                      .replace('{name}', selectedRow.name)
                      .replace('{rank}', String(selectedRank))
                      .replace('{total}', String(rankedRows.length))}
                  </p>
                  <RankingRow row={selectedRow} selected />
                </>
              )}
            </Card>
          </div>

          <Card title={tableTitle} note={t.common.sampleDataTag}>
            <DataTable
              columns={columns}
              rows={scopedRows}
              getRowId={(row) => row.id}
              defaultSortKey="access_pct"
              footer={
                <>
                  <span>
                    {tableFooterTemplate.replace('{shown}', String(scopedRows.length)).replace('{total}', String(scopedRows.length))}
                  </span>
                  <span>{t.common.sampleDataTag}</span>
                </>
              }
            />
          </Card>
        </>
      )}
    </div>
  )
}

function RankingRow({ row, selected = false }: { row: AreaRow; selected?: boolean }) {
  return (
    <div className={`grid grid-cols-[100px_1fr_44px] items-center gap-2.5 rounded-md py-[6px] ${selected ? '-mx-2 bg-green-50 px-2' : ''}`}>
      <span className="truncate text-[12.5px] font-semibold text-ink">{row.name}</span>
      <div className="h-4 rounded-[5px] bg-bg">
        <div className="h-4 rounded-[5px]" style={{ width: `${row.access_pct}%`, background: accessibilityColor(row.access_pct) }} />
      </div>
      <span className="text-right text-xs font-bold text-ink tabular-nums">{Math.round(row.access_pct)}%</span>
    </div>
  )
}

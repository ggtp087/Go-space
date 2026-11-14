import { useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { DonutChart } from '../components/ui/DonutChart'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { YearSelect } from '../components/ui/YearSelect'
import { AccessibilityChoropleth } from '../components/dashboard/AccessibilityChoropleth'
import { CompareKpiGrid } from '../components/dashboard/CompareKpiGrid'
import { AccessibilityRangeLegend } from '../components/dashboard/AccessibilityRangeLegend'
import { ComparisonTrendChart } from '../components/dashboard/ComparisonTrendChart'
import { TrendChart } from '../components/dashboard/TrendChart'
import { computeTrendYAxis } from '../components/dashboard/trendAxis'
import { formatYear } from '../i18n/formatYear'
import { useLanguage } from '../i18n/LanguageContext'
import type { Language } from '../i18n/LanguageContext'
import type { Strings } from '../i18n/strings'
import { useYear } from '../state/YearContext'
import { useArea } from '../state/AreaContext'
import type { AreaLevel } from '../mock/areas'
import { accessibilityColor, formatPct } from '../mock/areas'
import { comparisonPalette } from '../config/mapStyle'
import {
  BANGKOK_AREA_ID,
  defaultComparisonAreas,
  getAllSubDistrictOptions,
  getAreaMeta,
  getAreaRow,
  getDistrictOptions,
  getFirstAreaId,
  getMetricSeries,
  type AreaRow,
  type ComparisonArea,
} from '../mock/assessmentResults'
import type { Year } from '../mock/years'

type Mode = 'districts' | 'years'
type TrendValueMode = 'actual' | 'change'

type ComparisonItem = {
  key: string
  title: string
  subtitle: string
  color: string
  row: AreaRow | undefined
}

const MAX_COMPARISON_AREAS = 5

/** A comparison area's name is only ever a seed value (set once, at add-time) — this always re-resolves the current name for its id/language instead, so a language switch (or the frozen defaultComparisonAreas seed) never shows a stale name. */
function displayName(area: { id: string; name: string }, language: Language): string {
  return getAreaMeta(area.id, language)?.name ?? area.name
}

/** A comparison area's level badge — Bangkok is stored with level: 'district' (there's no separate "city" level), so it's picked out by id first. */
function levelBadgeText(area: ComparisonArea, t: Strings): string {
  if (area.id === BANGKOK_AREA_ID) return t.adminLevel.bangkok
  return area.level === 'district' ? t.adminLevel.district : t.adminLevel.subDistrict
}

/** Bangkok + every district + every sub-district (with its parent district named) — one flat, mixed-level pool to add from. */
function getMixedAreaPool(bangkokLabel: string, language: Language): { value: string; label: string }[] {
  return [
    { value: BANGKOK_AREA_ID, label: bangkokLabel },
    ...getDistrictOptions(language),
    ...getAllSubDistrictOptions(language).map((option) => ({
      value: option.value,
      label: `${option.label} (${getAreaMeta(option.value, language)?.parentName ?? ''})`,
    })),
  ]
}

function getAreaOptionsForLevel(level: AreaLevel, language: Language): { value: string; label: string }[] {
  if (level === 'district') return getDistrictOptions(language)
  return getAllSubDistrictOptions(language).map((option) => ({
    value: option.value,
    label: `${option.label} (${getAreaMeta(option.value, language)?.parentName ?? ''})`,
  }))
}

/**
 * The initial comparison set, seeded once from whatever's already selected
 * on Map/Dashboard (useArea()) — not kept in lockstep afterward, so editing
 * the comparison here doesn't reach back and change that shared selection.
 */
function buildInitialComparisonAreas(districtId: string, subDistrictId: string, bangkokLabel: string, language: Language): ComparisonArea[] {
  if (subDistrictId !== 'all') {
    const subMeta = getAreaMeta(subDistrictId, language)
    const districtMeta = subMeta?.parentId ? getAreaMeta(subMeta.parentId, language) : undefined
    const areas: ComparisonArea[] = []
    if (subMeta) areas.push({ id: subMeta.id, name: subMeta.name, level: 'sub-district', color: comparisonPalette[0] })
    if (districtMeta) areas.push({ id: districtMeta.id, name: districtMeta.name, level: 'district', color: comparisonPalette[1] })
    areas.push({ id: BANGKOK_AREA_ID, name: bangkokLabel, level: 'district', color: comparisonPalette[2] })
    return areas
  }
  if (districtId !== 'all') {
    const districtMeta = getAreaMeta(districtId, language)
    const areas: ComparisonArea[] = []
    if (districtMeta) areas.push({ id: districtMeta.id, name: districtMeta.name, level: 'district', color: comparisonPalette[0] })
    areas.push({ id: BANGKOK_AREA_ID, name: bangkokLabel, level: 'district', color: comparisonPalette[1] })
    return areas
  }
  return defaultComparisonAreas
}

export function ComparePage() {
  const { t, language } = useLanguage()
  const { year, setYear, years } = useYear()
  const { level, setLevel, districtId, setDistrictId, subDistrictId, setSubDistrictId } = useArea()

  const [mode, setMode] = useState<Mode>('districts')
  const [trendValueMode, setTrendValueMode] = useState<TrendValueMode>('actual')
  const [comparisonAreas, setComparisonAreas] = useState<ComparisonArea[]>(() =>
    buildInitialComparisonAreas(districtId, subDistrictId, t.map.bangkokLabel, language),
  )
  // Explicit user pick for the "add area" select; null means "use the first available option".
  const [areaToAdd, setAreaToAdd] = useState<string | null>(null)
  const [selectedYears, setSelectedYears] = useState<Year[]>(() =>
    Array.from(new Set<Year>([2018, 2022, year])).sort((a, b) => a - b),
  )

  const effectiveDistrictId = districtId === 'all' ? getFirstAreaId('district') : districtId
  const allSubDistrictOptions = getAllSubDistrictOptions(language)
  const yearsAreaId =
    level === 'sub-district'
      ? subDistrictId !== 'all'
        ? subDistrictId
        : (allSubDistrictOptions[0]?.value ?? effectiveDistrictId)
      : effectiveDistrictId
  const yearsAreaMeta = getAreaMeta(yearsAreaId, language)

  const areaPool = useMemo(() => getMixedAreaPool(t.map.bangkokLabel, language), [t.map.bangkokLabel, language])
  const availableToAdd = areaPool.filter((option) => !comparisonAreas.some((a) => a.id === option.value))
  const resolvedAreaToAdd =
    (areaToAdd && availableToAdd.some((option) => option.value === areaToAdd) ? areaToAdd : null) ??
    availableToAdd[0]?.value ??
    ''

  // The current Map/Dashboard selection — addable with one click if it
  // isn't already in the comparison. Most-specific first, same rule the Map
  // and Dashboard use for their own "focus area".
  const currentSelectionId = subDistrictId !== 'all' ? subDistrictId : districtId !== 'all' ? districtId : undefined
  const currentSelectionMeta = currentSelectionId ? getAreaMeta(currentSelectionId, language) : undefined
  const currentSelectionAlreadyAdded = currentSelectionMeta
    ? comparisonAreas.some((a) => a.id === currentSelectionMeta.id)
    : true

  function nextColor(): string {
    const usedColors = comparisonAreas.map((a) => a.color)
    return comparisonPalette.find((c) => !usedColors.includes(c)) ?? comparisonPalette[0]
  }

  function addArea() {
    if (comparisonAreas.length >= MAX_COMPARISON_AREAS) return
    const option = areaPool.find((o) => o.value === resolvedAreaToAdd)
    if (!option) return
    const meta = getAreaMeta(option.value, language)
    const color = nextColor()
    setComparisonAreas((current) => [...current, { id: option.value, name: option.label, color, level: meta?.level ?? 'district' }])
    setAreaToAdd(null)
  }

  function addCurrentSelection() {
    if (!currentSelectionMeta || currentSelectionAlreadyAdded || comparisonAreas.length >= MAX_COMPARISON_AREAS) return
    const color = nextColor()
    setComparisonAreas((current) => [
      ...current,
      { id: currentSelectionMeta.id, name: currentSelectionMeta.name, level: currentSelectionMeta.level, color },
    ])
  }

  function removeArea(id: string) {
    setComparisonAreas((current) => current.filter((a) => a.id !== id))
  }

  function toggleYear(y: Year) {
    setSelectedYears((current) => {
      if (current.includes(y)) {
        if (current.length <= 2) return current
        return current.filter((x) => x !== y)
      }
      if (current.length >= 3) return current
      return [...current, y].sort((a, b) => a - b)
    })
  }

  const comparisonItems: ComparisonItem[] =
    mode === 'districts'
      ? comparisonAreas.map((a) => ({
          key: a.id,
          title: displayName(a, language),
          subtitle: formatYear(year, language),
          color: a.color,
          row: getAreaRow(a.id, year, language),
        }))
      : selectedYears.map((y, index) => ({
          key: `${yearsAreaId}-${y}`,
          title: formatYear(y, language),
          subtitle: yearsAreaMeta?.name ?? '',
          color: comparisonPalette[index % comparisonPalette.length],
          row: getAreaRow(yearsAreaId, y, language),
        }))

  const yearsAccessSeries = getMetricSeries(yearsAreaId, 'access_pct')
  const yearsShareSeries = getMetricSeries(yearsAreaId, 'share_ops_pct')
  const yearsAccessAxis = useMemo(
    () => computeTrendYAxis(yearsAccessSeries.map((point) => point.value)),
    [yearsAccessSeries],
  )
  const yearsShareAxis = useMemo(() => computeTrendYAxis(yearsShareSeries.map((point) => point.value)), [yearsShareSeries])

  // Overlaid per-area series for the "districts" mode trend card — every
  // compared area's full 2017-2026 trajectory, in its own series color.
  const comparisonAccessSeries = useMemo(
    () => comparisonAreas.map((a) => ({ id: a.id, points: getMetricSeries(a.id, 'access_pct'), color: a.color, label: displayName(a, language) })),
    [comparisonAreas, language],
  )
  const comparisonShareSeries = useMemo(
    () => comparisonAreas.map((a) => ({ id: a.id, points: getMetricSeries(a.id, 'share_ops_pct'), color: a.color, label: displayName(a, language) })),
    [comparisonAreas, language],
  )
  const highlightEntries = useMemo(() => comparisonAreas.map((a) => ({ id: a.id, color: a.color })), [comparisonAreas])

  return (
    <div className="flex-1 overflow-auto p-10">
      <h1 className="text-2xl font-bold text-ink">{t.compare.title}</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] text-slate">{t.compare.subtitle}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SegmentedControl
          className="max-w-xs"
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          options={[
            { value: 'districts', label: t.compare.modeDistricts },
            { value: 'years', label: t.compare.modeYears },
          ]}
          fitContent
        />
        {mode === 'years' && (
          <SegmentedControl
            className="max-w-xs"
            value={level}
            onChange={(value) => setLevel(value as AreaLevel)}
            options={[
              { value: 'district', label: t.adminLevel.district },
              { value: 'sub-district', label: t.adminLevel.subDistrict },
            ]}
            fitContent
          />
        )}
      </div>

      {mode === 'districts' ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {comparisonAreas.map((a) => (
            <Chip key={a.id} label={displayName(a, language)} removable swatchColor={a.color} onRemove={() => removeArea(a.id)} />
          ))}
          {comparisonAreas.length < MAX_COMPARISON_AREAS && availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                options={availableToAdd}
                value={resolvedAreaToAdd}
                onChange={(event) => setAreaToAdd(event.target.value)}
                className="w-56"
              />
              <Button variant="secondary" onClick={addArea}>
                {t.compare.addArea}
              </Button>
            </div>
          )}
          {currentSelectionMeta && !currentSelectionAlreadyAdded && comparisonAreas.length < MAX_COMPARISON_AREAS && (
            <Button variant="ghost" onClick={addCurrentSelection}>
              {t.compare.addCurrentSelection.replace('{name}', displayName(currentSelectionMeta, language))}
            </Button>
          )}
          <div className="ml-auto">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.compare.yearLabel}</span>
            <YearSelect years={years} value={year} onChange={setYear} formatOption={(y) => formatYear(y, language)} />
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <Select
            label={t.compare.areaLabel}
            options={getAreaOptionsForLevel(level, language)}
            value={yearsAreaId}
            onChange={(event) => (level === 'district' ? setDistrictId(event.target.value) : setSubDistrictId(event.target.value))}
            className="w-56"
          />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.compare.selectYearsLabel}</span>
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <Chip key={y} label={formatYear(y, language)} selected={selectedYears.includes(y)} onSelect={() => toggleYear(y)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <Card
        className="mt-8"
        title={t.compare.chartTitle}
        note={t.common.sampleDataTag}
        actions={
          <div className="flex gap-4">
            {comparisonItems.map((item) => (
              <span key={item.key} className="flex items-center gap-1.5 text-xs font-semibold text-slate">
                <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: item.color }} />
                {item.title}
              </span>
            ))}
          </div>
        }
      >
        <CompareKpiGrid items={comparisonItems} t={t} />
      </Card>

      <Card
        className="mt-6"
        title={t.compare.lineChartTitle}
        note={t.common.sampleDataTag}
        actions={
          mode === 'districts' ? (
            <SegmentedControl
              value={trendValueMode}
              onChange={(value) => setTrendValueMode(value as TrendValueMode)}
              options={[
                { value: 'actual', label: t.compare.trendModeActual },
                { value: 'change', label: t.compare.trendModeChange },
              ]}
              fitContent
            />
          ) : undefined
        }
      >
        <div className="space-y-8">
          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink">{t.compare.accessibilityCaption}</p>
            {mode === 'districts' ? (
              <ComparisonTrendChart series={comparisonAccessSeries} mode={trendValueMode} selectedYear={year} language={language} t={t} height={300} />
            ) : (
              <TrendChart
                points={yearsAccessSeries}
                selectedYears={selectedYears}
                yMin={yearsAccessAxis.min}
                yMax={yearsAccessAxis.max}
                yTicks={yearsAccessAxis.ticks}
                color="var(--color-green-600)"
                language={language}
                noDataLabel={t.common.noData}
                axisNote={t.dashboard.trend.axisNote}
                height={300}
              />
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink">{t.compare.metricOpsShare}</p>
            {mode === 'districts' ? (
              <ComparisonTrendChart series={comparisonShareSeries} mode={trendValueMode} selectedYear={year} language={language} t={t} height={300} />
            ) : (
              <TrendChart
                points={yearsShareSeries}
                selectedYears={selectedYears}
                yMin={yearsShareAxis.min}
                yMax={yearsShareAxis.max}
                yTicks={yearsShareAxis.ticks}
                color="var(--color-accent-600)"
                language={language}
                noDataLabel={t.common.noData}
                axisNote={t.dashboard.trend.axisNote}
                height={300}
              />
            )}
          </div>
        </div>
      </Card>

      {mode === 'districts' && (
        <Card className="mt-6" title={t.compare.mapCardTitle} note={t.common.sampleDataTag}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="w-full lg:w-[60%]">
              <AccessibilityChoropleth
                districtId="all"
                subDistrictId="all"
                year={year}
                highlights={highlightEntries}
                fitToIds={comparisonAreas.map((a) => a.id)}
                className="h-[400px] w-full"
                variant="plain"
                language={language}
              />
              <AccessibilityRangeLegend title={t.dashboard.kpi.accessibilityHeading} note={t.map.legendIntervalsNote} className="mt-3" />
            </div>
            <div className="w-full space-y-1.5 lg:w-[40%]">
              {comparisonAreas.map((a) => {
                const row = getAreaRow(a.id, year, language)
                return (
                  <div key={a.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px]">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: a.color }} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{displayName(a, language)}</span>
                    <span className="flex-none rounded-full bg-bg px-2 py-0.5 text-[10.5px] font-semibold text-slate">
                      {levelBadgeText(a, t)}
                    </span>
                    <span className="flex-none text-right font-bold text-ink tabular-nums">{row ? formatPct(row.access_pct) : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {comparisonItems.map((item) => (
          <Card key={item.key} className="min-w-[200px] flex-1 snap-start overflow-hidden">
            <div className="mb-1 flex items-center justify-center gap-1.5">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: item.color }} />
              <h3 className="truncate text-[13.5px] font-bold text-ink">{item.title}</h3>
            </div>
            <p className="mb-2 text-center text-[11px] text-slate">{item.subtitle}</p>

            {!item.row ? (
              <div className="rounded-lg border border-dashed border-line-2 p-3 text-center">
                <p className="text-[12.5px] font-semibold text-ink">{t.common.noDataTitle}</p>
                <p className="mt-1 text-[11px] text-slate">
                  {t.common.noDataBody.replace('{year}', item.title.match(/^\d{4}$/) ? item.title : formatYear(year, language))}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-1 text-center text-[10.5px] whitespace-nowrap text-slate">{t.compare.accessibilityCaption}</p>
                <div className="flex justify-center" title={t.compare.accessibilityTooltip}>
                  <DonutChart
                    size={116}
                    strokeWidth={9}
                    centerFontSize={20}
                    percent={item.row.access_pct}
                    centerLabel={formatPct(item.row.access_pct)}
                    color={accessibilityColor(item.row.access_pct)}
                  />
                </div>
                <div className="mt-3 space-y-1 text-[11px] text-slate">
                  <div className="flex items-center justify-between gap-2">
                    <span>{t.compare.populationLabel}</span>
                    <span className="font-bold text-ink tabular-nums">{Math.round(item.row.total_population).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>{t.map.coveredLabel}</span>
                    <span className="font-bold text-ink tabular-nums">{Math.round(item.row.population_with_access).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>{t.map.notCoveredLabel}</span>
                    <span className="font-bold text-ink tabular-nums">
                      {Math.round(item.row.total_population - item.row.population_with_access).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Label on its own full-width line, then bar + value below —
                    so a wide value can never push the label onto a second
                    line and misalign the cards. */}
                <div className="mt-3">
                  <p className="text-[11px] text-slate">{t.compare.metricOpsShare}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 min-w-0 flex-1 rounded-full bg-bg">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, item.row.share_ops_pct))}%`, background: item.color }}
                      />
                    </div>
                    <span className="flex-none text-[12.5px] font-bold text-ink tabular-nums">{formatPct(item.row.share_ops_pct)}</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center text-[10.5px] text-mist">{t.common.sampleDataTag}</p>
    </div>
  )
}

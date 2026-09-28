import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { DonutChart } from '../components/ui/DonutChart'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { TrendLine } from '../components/ui/TrendLine'
import { YearSelect } from '../components/ui/YearSelect'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'
import { useArea } from '../state/AreaContext'
import type { AreaLevel, AreaRow } from '../mock/areas'
import { accessibilityColor, getAreaIndicators, getCoverage, defaultComparisonAreas, getDistrictOptions, type ComparisonArea } from '../mock/districts'
import { getAllSubDistrictOptions } from '../mock/subdistricts'
import { getAreaMeta, getAreaRow, getFirstAreaId, getMetricSeries, type MetricKey } from '../mock/areaIndex'
import type { Year } from '../mock/years'

type Mode = 'districts' | 'years'

type ComparisonItem = {
  key: string
  title: string
  subtitle: string
  color: string
  row: AreaRow | undefined
}

const PALETTE = ['#1B4332', '#3F8F63', '#C2660F']
const CHART_BAR_MAX_HEIGHT = 170

function getAreaOptionsForLevel(level: AreaLevel): { value: string; label: string }[] {
  if (level === 'district') return getDistrictOptions()
  return getAllSubDistrictOptions().map((option) => ({
    value: option.value,
    label: `${option.label} (${getAreaMeta(option.value)?.parentName ?? ''})`,
  }))
}

export function ComparePage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()
  const { level, setLevel, districtId, setDistrictId, subDistrictId, setSubDistrictId } = useArea()

  const [mode, setMode] = useState<Mode>('districts')
  const [comparisonAreas, setComparisonAreas] = useState<ComparisonArea[]>(defaultComparisonAreas)
  // Explicit user pick for the "add area" select; null means "use the first available option".
  const [areaToAdd, setAreaToAdd] = useState<string | null>(null)
  const [selectedYears, setSelectedYears] = useState<Year[]>(() =>
    Array.from(new Set<Year>([2018, 2022, year])).sort((a, b) => a - b),
  )

  // The comparison-chip level tracks the chips themselves; only falls back to
  // the shared level when there are none yet, so clearing chips re-opens both options.
  const comparisonLevel: AreaLevel = comparisonAreas[0]?.level ?? level

  const effectiveDistrictId = districtId === 'all' ? getFirstAreaId('district') : districtId
  const allSubDistrictOptions = getAllSubDistrictOptions()
  const yearsAreaId =
    level === 'sub-district'
      ? subDistrictId !== 'all'
        ? subDistrictId
        : allSubDistrictOptions[0]?.value ?? effectiveDistrictId
      : effectiveDistrictId
  const yearsAreaMeta = getAreaMeta(yearsAreaId)

  const areaPool = getAreaOptionsForLevel(comparisonLevel)
  const availableToAdd = areaPool.filter((option) => !comparisonAreas.some((a) => a.id === option.value))
  const resolvedAreaToAdd =
    (areaToAdd && availableToAdd.some((option) => option.value === areaToAdd) ? areaToAdd : null) ??
    availableToAdd[0]?.value ??
    ''

  function addArea() {
    if (comparisonAreas.length >= 3) return
    const option = areaPool.find((o) => o.value === resolvedAreaToAdd)
    if (!option) return
    const usedColors = comparisonAreas.map((a) => a.color)
    const color = PALETTE.find((c) => !usedColors.includes(c)) ?? PALETTE[0]
    setComparisonAreas((current) => [...current, { id: option.value, name: option.label, color, level: comparisonLevel }])
    setAreaToAdd(null)
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
          title: a.name,
          subtitle: String(year),
          color: a.color,
          row: getAreaRow(a.id, year),
        }))
      : selectedYears.map((y, index) => ({
          key: `${yearsAreaId}-${y}`,
          title: String(y),
          subtitle: yearsAreaMeta?.name ?? '',
          color: PALETTE[index % PALETTE.length],
          row: getAreaRow(yearsAreaId, y),
        }))

  const metricGroups: { key: MetricKey; label: string }[] = [
    { key: 'accessibilityPct', label: t.compare.metricAccessibility },
    { key: 'openSpaceSharePct', label: t.map.openSpaceShareLabel },
    { key: 'streetsPct', label: t.map.streetsLabel },
    { key: 'builtUpOpenPct', label: t.map.builtUpOpenLabel },
  ]

  function metricValue(row: AreaRow | undefined, metric: MetricKey): number | null {
    if (!row) return null
    if (metric === 'accessibilityPct') return row.accessibilityPct
    return getAreaIndicators(row)[metric]
  }

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
        />
        <SegmentedControl
          className="max-w-xs"
          value={comparisonLevel}
          onChange={(value) => setLevel(value as AreaLevel)}
          options={[
            {
              value: 'district',
              label: t.adminLevel.district,
              disabled: mode === 'districts' && comparisonAreas.length > 0 && comparisonLevel !== 'district',
              title: mode === 'districts' && comparisonAreas.length > 0 && comparisonLevel !== 'district' ? t.compare.levelLockedTooltip : undefined,
            },
            {
              value: 'sub-district',
              label: t.adminLevel.subDistrict,
              disabled: mode === 'districts' && comparisonAreas.length > 0 && comparisonLevel !== 'sub-district',
              title: mode === 'districts' && comparisonAreas.length > 0 && comparisonLevel !== 'sub-district' ? t.compare.levelLockedTooltip : undefined,
            },
          ]}
        />
      </div>

      {mode === 'districts' ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {comparisonAreas.map((a) => (
            <Chip key={a.id} label={a.name} removable swatchColor={a.color} onRemove={() => removeArea(a.id)} />
          ))}
          {comparisonAreas.length < 3 && availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                options={availableToAdd}
                value={resolvedAreaToAdd}
                onChange={(event) => setAreaToAdd(event.target.value)}
                className="w-48"
              />
              <Button variant="secondary" onClick={addArea}>
                {t.compare.addArea}
              </Button>
            </div>
          )}
          <div className="ml-auto">
            <YearSelect years={years} value={year} onChange={setYear} />
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <Select
            label={t.compare.areaLabel}
            options={level === 'district' ? getDistrictOptions() : getAreaOptionsForLevel('sub-district')}
            value={yearsAreaId}
            onChange={(event) => (level === 'district' ? setDistrictId(event.target.value) : setSubDistrictId(event.target.value))}
            className="w-56"
          />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.compare.selectYearsLabel}</span>
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <Chip key={y} label={String(y)} selected={selectedYears.includes(y)} onSelect={() => toggleYear(y)} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-mist">{t.compare.selectYearsHint}</p>
          </div>
        </div>
      )}

      <Card
        className="mt-8"
        title={t.compare.chartTitle}
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
        <div className="flex items-end justify-around gap-4 border-b border-line px-5">
          {metricGroups.map((group) => {
            const values = comparisonItems.map((item) => metricValue(item.row, group.key))
            const numericValues = values.filter((v): v is number => v !== null)
            const maxValue = Math.max(...numericValues, 1)
            return (
              <div key={group.key} className="flex flex-col items-center">
                <div className="flex items-end gap-1.5" style={{ height: CHART_BAR_MAX_HEIGHT }}>
                  {comparisonItems.map((item, index) => {
                    const value = values[index]
                    if (value === null) {
                      return (
                        <div key={item.key} className="flex w-[26px] flex-none flex-col items-center justify-end" style={{ height: CHART_BAR_MAX_HEIGHT }}>
                          <span className="text-[10.5px] font-bold text-mist">—</span>
                        </div>
                      )
                    }
                    const heightPx = Math.max(4, (value / maxValue) * CHART_BAR_MAX_HEIGHT)
                    return (
                      <div
                        key={item.key}
                        className="relative w-[26px] rounded-t-[5px]"
                        style={{ height: heightPx, background: item.color }}
                      >
                        <span className="absolute -top-[18px] left-0 right-0 text-center text-[10.5px] font-bold text-ink tabular-nums">
                          {value}%
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mb-5 mt-2.5 max-w-[130px] text-center text-[11.5px] font-semibold text-slate">{group.label}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {mode === 'years' && (
        <Card className="mt-6" title={t.compare.lineChartTitle} note={t.common.sampleDataTag}>
          <div className="grid gap-6 sm:grid-cols-2">
            {metricGroups.map((group) => (
              <div key={group.key}>
                <p className="mb-1.5 text-[12.5px] font-semibold text-ink">{group.label}</p>
                <TrendLine
                  points={getMetricSeries(yearsAreaId, group.key)}
                  highlightYears={selectedYears}
                  height={110}
                  showAxisLabels
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comparisonItems.map((item) => (
          <Card key={item.key} className="overflow-hidden">
            <div className="mb-1 flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: item.color }} />
              <h3 className="text-[15px] font-bold text-ink">{item.title}</h3>
            </div>
            <p className="mb-3 text-center text-xs text-slate">{item.subtitle}</p>

            <div className="mb-3 flex h-[110px] items-center justify-center rounded-lg border border-dashed border-line-2 text-xs text-slate">
              {t.map.mapPlaceholder}
            </div>

            {!item.row ? (
              <div className="rounded-lg border border-dashed border-line-2 p-4 text-center">
                <p className="text-[13px] font-semibold text-ink">{t.common.noDataTitle}</p>
                <p className="mt-1 text-[12px] text-slate">
                  {t.common.noDataBody.replace('{year}', item.title.match(/^\d{4}$/) ? item.title : String(year))}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <DonutChart
                    size={90}
                    percent={item.row.accessibilityPct}
                    centerLabel={`${item.row.accessibilityPct}%`}
                    subLabel={t.compare.ofResidentsAccessible}
                    color={accessibilityColor(item.row.accessibilityPct)}
                  />
                </div>

                <div className="mt-4 flex justify-around text-center text-[11px] text-slate">
                  <div>
                    <div className="text-[15px] font-bold text-ink tabular-nums">{item.row.population.toLocaleString()}</div>
                    {t.compare.populationLabel}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-ink tabular-nums">{getCoverage(item.row).covered.toLocaleString()}</div>
                    {t.map.coveredLabel}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-ink tabular-nums">{getCoverage(item.row).notCovered.toLocaleString()}</div>
                    {t.map.notCoveredLabel}
                  </div>
                </div>

                <div className="mt-4">
                  <ProgressBar
                    className="mb-2.5"
                    size="sm"
                    label={t.map.openSpaceShareLabel}
                    valueLabel={`${getAreaIndicators(item.row).openSpaceSharePct}%`}
                    value={getAreaIndicators(item.row).openSpaceSharePct}
                    color={item.color}
                  />
                  <ProgressBar
                    className="mb-2.5"
                    size="sm"
                    label={t.map.streetsLabel}
                    valueLabel={`${getAreaIndicators(item.row).streetsPct}%`}
                    value={getAreaIndicators(item.row).streetsPct}
                    color="var(--color-slate)"
                  />
                  <ProgressBar
                    size="sm"
                    label={t.map.builtUpOpenLabel}
                    valueLabel={`${getAreaIndicators(item.row).builtUpOpenPct}%`}
                    value={getAreaIndicators(item.row).builtUpOpenPct}
                    color="var(--color-accent-600)"
                  />
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

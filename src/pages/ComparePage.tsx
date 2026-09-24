import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { DonutChart } from '../components/ui/DonutChart'
import { ProgressBar } from '../components/ui/ProgressBar'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { YearSelect } from '../components/ui/YearSelect'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'
import {
  accessibilityColor,
  getAreaIndicators,
  getCoverage,
  getDistrictRow,
  sampleComparisonDistricts,
  sampleDistrictOptions,
  type ComparisonDistrict,
  type DistrictRow,
} from '../mock/districts'
import type { Year } from '../mock/years'

type Mode = 'districts' | 'years'

type ComparisonItem = {
  key: string
  title: string
  subtitle: string
  color: string
  row: DistrictRow
}

const PALETTE = ['#1B4332', '#3F8F63', '#C2660F']
const CHART_BAR_MAX_HEIGHT = 170

export function ComparePage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()

  const [mode, setMode] = useState<Mode>('districts')
  const [comparisonDistricts, setComparisonDistricts] = useState<ComparisonDistrict[]>(sampleComparisonDistricts)
  // Explicit user pick for the "add district" select; null means "use the first available option".
  const [districtToAdd, setDistrictToAdd] = useState<string | null>(null)

  const [yearsDistrict, setYearsDistrict] = useState(sampleDistrictOptions[0].value)
  const [yearA, setYearA] = useState<Year>(year)
  const [yearB, setYearB] = useState<Year>(years.find((y) => y !== year) ?? years[0])

  const availableToAdd = sampleDistrictOptions.filter(
    (option) => !comparisonDistricts.some((d) => d.id === option.value),
  )
  const resolvedDistrictToAdd =
    (districtToAdd && availableToAdd.some((option) => option.value === districtToAdd) ? districtToAdd : null) ??
    availableToAdd[0]?.value ??
    ''

  function addDistrict() {
    if (comparisonDistricts.length >= 3) return
    const option = sampleDistrictOptions.find((o) => o.value === resolvedDistrictToAdd)
    if (!option) return
    const usedColors = comparisonDistricts.map((d) => d.color)
    const color = PALETTE.find((c) => !usedColors.includes(c)) ?? PALETTE[0]
    setComparisonDistricts((current) => [...current, { id: option.value, name: option.label, color }])
    setDistrictToAdd(null)
  }

  function removeDistrict(id: string) {
    setComparisonDistricts((current) => current.filter((d) => d.id !== id))
  }

  const comparisonItems: ComparisonItem[] =
    mode === 'districts'
      ? comparisonDistricts.map((d) => ({
          key: d.id,
          title: d.name,
          subtitle: String(year),
          color: d.color,
          row: getDistrictRow(d.id, year)!,
        }))
      : ([yearA, yearB] as Year[]).map((y, index) => ({
          key: `${yearsDistrict}-${y}`,
          title: String(y),
          subtitle: sampleDistrictOptions.find((o) => o.value === yearsDistrict)?.label ?? '',
          color: PALETTE[index],
          row: getDistrictRow(yearsDistrict, y)!,
        }))

  const metricGroups = [
    { key: 'accessibility', label: t.compare.metricAccessibility, value: (row: DistrictRow) => row.accessibilityPct },
    { key: 'openSpaceShare', label: t.map.openSpaceShareLabel, value: (row: DistrictRow) => getAreaIndicators(row).openSpaceSharePct },
    { key: 'streets', label: t.map.streetsLabel, value: (row: DistrictRow) => getAreaIndicators(row).streetsPct },
    { key: 'builtUpOpen', label: t.map.builtUpOpenLabel, value: (row: DistrictRow) => getAreaIndicators(row).builtUpOpenPct },
  ]

  return (
    <div className="flex-1 overflow-auto p-10">
      <h1 className="text-2xl font-bold text-ink">{t.compare.title}</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] text-slate">{t.compare.subtitle}</p>

      <SegmentedControl
        className="mt-6 max-w-sm"
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        options={[
          { value: 'districts', label: t.compare.modeDistricts },
          { value: 'years', label: t.compare.modeYears },
        ]}
      />

      {mode === 'districts' ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {comparisonDistricts.map((d) => (
            <Chip key={d.id} label={d.name} removable swatchColor={d.color} onRemove={() => removeDistrict(d.id)} />
          ))}
          {comparisonDistricts.length < 3 && availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                options={availableToAdd}
                value={resolvedDistrictToAdd}
                onChange={(event) => setDistrictToAdd(event.target.value)}
                className="w-40"
              />
              <Button variant="secondary" onClick={addDistrict}>
                {t.compare.addDistrict}
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
            label={t.compare.districtLabel}
            options={sampleDistrictOptions}
            value={yearsDistrict}
            onChange={(event) => setYearsDistrict(event.target.value)}
            className="w-48"
          />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.compare.yearALabel}</span>
            <YearSelect years={years} value={yearA} onChange={setYearA} />
          </div>
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{t.compare.yearBLabel}</span>
            <YearSelect years={years} value={yearB} onChange={setYearB} />
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
            const values = comparisonItems.map((item) => group.value(item.row))
            const maxValue = Math.max(...values, 1)
            return (
              <div key={group.key} className="flex flex-col items-center">
                <div className="flex items-end gap-1.5" style={{ height: CHART_BAR_MAX_HEIGHT }}>
                  {comparisonItems.map((item, index) => {
                    const value = values[index]
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

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comparisonItems.map((item) => {
          const { covered, notCovered } = getCoverage(item.row)
          const { openSpaceSharePct, streetsPct, builtUpOpenPct } = getAreaIndicators(item.row)
          return (
            <Card key={item.key} className="overflow-hidden">
              <div className="mb-1 flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: item.color }} />
                <h3 className="text-[15px] font-bold text-ink">{item.title}</h3>
              </div>
              <p className="mb-3 text-center text-xs text-slate">{item.subtitle}</p>

              <div className="mb-3 flex h-[110px] items-center justify-center rounded-lg border border-dashed border-line-2 text-xs text-slate">
                {t.map.mapPlaceholder}
              </div>

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
                  <div className="text-[15px] font-bold text-ink tabular-nums">{covered.toLocaleString()}</div>
                  {t.map.coveredLabel}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-ink tabular-nums">{notCovered.toLocaleString()}</div>
                  {t.map.notCoveredLabel}
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar
                  className="mb-2.5"
                  size="sm"
                  label={t.map.openSpaceShareLabel}
                  valueLabel={`${openSpaceSharePct}%`}
                  value={openSpaceSharePct}
                  color={item.color}
                />
                <ProgressBar
                  className="mb-2.5"
                  size="sm"
                  label={t.map.streetsLabel}
                  valueLabel={`${streetsPct}%`}
                  value={streetsPct}
                  color="var(--color-slate)"
                />
                <ProgressBar
                  size="sm"
                  label={t.map.builtUpOpenLabel}
                  valueLabel={`${builtUpOpenPct}%`}
                  value={builtUpOpenPct}
                  color="var(--color-accent-600)"
                />
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mt-5 text-center text-[10.5px] text-mist">{t.common.sampleDataTag}</p>
    </div>
  )
}

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

  return (
    <div className="flex-1 p-10">
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

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comparisonItems.map((item) => (
          <Card key={item.key} className="text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: item.color }} />
              <h3 className="text-[15px] font-bold text-ink">{item.title}</h3>
            </div>
            <p className="mb-3 text-xs text-slate">{item.subtitle}</p>

            <div className="flex justify-center">
              <DonutChart
                size={90}
                percent={item.row.accessibilityPct}
                centerLabel={`${item.row.accessibilityPct}%`}
                subLabel="of residents"
                color={accessibilityColor(item.row.accessibilityPct)}
              />
            </div>

            <div className="mt-4 flex justify-around text-center text-[11px] text-slate">
              <div>
                <div className="text-[15px] font-bold text-ink tabular-nums">{item.row.population.toLocaleString()}</div>
                Population
              </div>
              <div>
                <div className="text-[15px] font-bold text-ink tabular-nums">{item.row.openSpaces}</div>
                Open spaces
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar label="Open space share" valueLabel={`${item.row.opsSharePct}%`} value={item.row.opsSharePct} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

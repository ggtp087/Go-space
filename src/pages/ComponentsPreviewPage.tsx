import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Toggle } from '../components/ui/Toggle'
import { Chip } from '../components/ui/Chip'
import { Card } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DonutChart } from '../components/ui/DonutChart'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { RangeSlider } from '../components/ui/RangeSlider'
import { SidePanel } from '../components/ui/SidePanel'
import { Legend } from '../components/ui/Legend'
import { DataTable, type DataTableColumn } from '../components/ui/DataTable'
import { YearSelect } from '../components/ui/YearSelect'
import { useLanguage } from '../i18n/LanguageContext'
import { getKpisForYear } from '../mock/kpis'
import {
  accessibilityColor,
  getDistrictRowsForYear,
  sampleComparisonDistricts,
  sampleDistrictOptions,
  sampleOpenSpaceTypes,
  type DistrictRow,
} from '../mock/districts'
import { accessibilityLegendSteps } from '../mock/accessibilityLegend'
import { availableYears, defaultYear, type Year } from '../mock/years'

// Purely presentational — this page is dev-only scaffolding for checking
// components against the design, not shipped product copy.
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

const TABLE_COLUMNS: DataTableColumn<DistrictRow>[] = [
  {
    key: 'name',
    header: 'District',
    render: (row) => <span className="font-semibold">{row.name}</span>,
  },
  { key: 'population', header: 'Population', sortable: true, align: 'right' },
  {
    key: 'accessibilityPct',
    header: 'Accessibility %',
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
  { key: 'openSpaces', header: 'Open spaces', sortable: true, align: 'right' },
  { key: 'opsSharePct', header: 'OPS share %', sortable: true, align: 'right', render: (row) => `${row.opsSharePct}%` },
]

export function ComponentsPreviewPage() {
  const { t } = useLanguage()

  const [selectedTypes, setSelectedTypes] = useState<string[]>([sampleOpenSpaceTypes[0]])
  const [comparisonDistricts, setComparisonDistricts] = useState(sampleComparisonDistricts)
  const [layerOn, setLayerOn] = useState(true)
  const [serviceAreaOn, setServiceAreaOn] = useState(false)
  const [adminLevel, setAdminLevel] = useState<'district' | 'sub-district'>('district')
  const [range, setRange] = useState<[number, number]>([22, 85])
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [district, setDistrict] = useState(sampleDistrictOptions[0].value)
  const [previewYear, setPreviewYear] = useState<Year>(defaultYear)

  const districtRows = getDistrictRowsForYear(previewYear)
  const featuredDistrict = districtRows.find((row) => row.id === 'chatuchak')!

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="mx-auto max-w-[1200px] space-y-10">
        <header>
          <h1 className="text-2xl font-bold text-ink">Component preview</h1>
          <p className="mt-1 text-sm text-slate">
            Temporary QA page — every component below is fed sample props from <code>src/mock/</code>. Remove once
            real pages are assembled.
          </p>
        </header>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button
              variant="primary"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              }
            >
              With icon
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </Section>

        <Section title="Input">
          <div className="grid max-w-md gap-4">
            <Input
              label="Work email"
              placeholder="name@bma.go.th"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              }
            />
            <Input label="Password" type="password" defaultValue="password123" showPasswordToggle />
            <Input label="With error" defaultValue="not-an-email" error="Enter a valid email address" />
          </div>
        </Section>

        <Section title="Select">
          <Select
            label="District"
            className="max-w-xs"
            options={sampleDistrictOptions}
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          />
        </Section>

        <Section title="Toggle">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm text-ink">
              <Toggle checked={layerOn} onChange={setLayerOn} label="Public green & open spaces" />
              Public green &amp; open spaces
            </label>
            <label className="flex items-center gap-3 text-sm text-ink">
              <Toggle checked={serviceAreaOn} onChange={setServiceAreaOn} label="400 m service areas" />
              400 m service areas
            </label>
          </div>
        </Section>

        <Section title="Chip">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {sampleOpenSpaceTypes.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  selected={selectedTypes.includes(type)}
                  onSelect={() =>
                    setSelectedTypes((current) =>
                      current.includes(type) ? current.filter((t2) => t2 !== type) : [...current, type],
                    )
                  }
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {comparisonDistricts.map((d) => (
                <Chip
                  key={d.id}
                  label={d.name}
                  removable
                  swatchColor={d.color}
                  onRemove={() => setComparisonDistricts((current) => current.filter((x) => x.id !== d.id))}
                />
              ))}
            </div>
          </div>
        </Section>

        <Section title="Card">
          <Card title="Accessibility by district" note="Sample data" className="max-w-md">
            <p className="text-sm text-slate">Card body content goes here — KPIs, charts, tables, etc.</p>
          </Card>
        </Section>

        <Section title="YearSelect">
          <YearSelect years={availableYears} value={previewYear} onChange={setPreviewYear} />
          <p className="mt-2 text-xs text-slate">Drives the KpiCard and DataTable sections below.</p>
        </Section>

        <Section title="KpiCard">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {getKpisForYear(previewYear).map((kpi) => (
              <KpiCard key={kpi.id} icon={KPI_ICONS[kpi.id]} value={kpi.value} label={kpi.label} tone={kpi.tone} />
            ))}
          </div>
        </Section>

        <Section title="ProgressBar">
          <div className="max-w-md space-y-3">
            <ProgressBar label="Open public space share" valueLabel={`${featuredDistrict.opsSharePct}%`} value={featuredDistrict.opsSharePct} />
            <ProgressBar label="Accessibility" valueLabel={`${featuredDistrict.accessibilityPct}%`} value={featuredDistrict.accessibilityPct} color={accessibilityColor(featuredDistrict.accessibilityPct)} size="sm" />
          </div>
        </Section>

        <Section title="DonutChart">
          <DonutChart percent={featuredDistrict.accessibilityPct} centerLabel={`${featuredDistrict.accessibilityPct}%`} subLabel="of residents" />
        </Section>

        <Section title="SegmentedControl">
          <SegmentedControl
            className="max-w-xs"
            value={adminLevel}
            onChange={(value) => setAdminLevel(value as 'district' | 'sub-district')}
            options={[
              { value: 'district', label: t.adminLevel.district },
              { value: 'sub-district', label: t.adminLevel.subDistrict },
            ]}
          />
        </Section>

        <Section title="RangeSlider">
          <div className="max-w-xs">
            <RangeSlider min={0} max={100} value={range} onChange={setRange} formatLabel={(v) => `${v}%`} />
          </div>
        </Section>

        <Section title="SidePanel">
          <div className="h-[360px] overflow-hidden rounded-xl border border-line">
            <SidePanel
              title="Layers & filters"
              collapsed={panelCollapsed}
              onToggleCollapse={() => setPanelCollapsed((v) => !v)}
              width={280}
              footer={<Button variant="primary" fullWidth>Add to comparison</Button>}
            >
              <div className="space-y-3">
                {sampleOpenSpaceTypes.slice(0, 3).map((type) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-[13.5px] text-ink">{type}</span>
                    <Toggle checked label={type} onChange={() => {}} />
                  </div>
                ))}
              </div>
            </SidePanel>
          </div>
        </Section>

        <Section title="Legend">
          <Legend title={t.map.legendTitle} note={t.map.legendNote} steps={accessibilityLegendSteps} />
        </Section>

        <Section title="DataTable">
          <DataTable
            columns={TABLE_COLUMNS}
            rows={districtRows}
            getRowId={(row) => row.id}
            defaultSortKey="accessibilityPct"
            footer={
              <>
                <span>Showing {districtRows.length} of 50 districts</span>
                <span>All figures are sample data for demonstration</span>
              </>
            }
          />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-mist">{title}</h2>
      {children}
    </section>
  )
}

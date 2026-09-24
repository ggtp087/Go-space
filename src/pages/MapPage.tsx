import { useState, type ReactNode } from 'react'
import { Chip } from '../components/ui/Chip'
import { DonutChart } from '../components/ui/DonutChart'
import { Legend } from '../components/ui/Legend'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RangeSlider } from '../components/ui/RangeSlider'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { SidePanel } from '../components/ui/SidePanel'
import { Toggle } from '../components/ui/Toggle'
import { YearSelect } from '../components/ui/YearSelect'
import { Button } from '../components/ui/Button'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'
import { accessibilityLegendSteps } from '../mock/accessibilityLegend'
import { basemapOptions } from '../mock/basemaps'
import {
  getAreaIndicators,
  getCoverage,
  getDistrictRow,
  sampleDistrictOptions,
  sampleOpenSpaceTypes,
} from '../mock/districts'
import { mapLayers } from '../mock/mapLayers'
import { nearbySpaces } from '../mock/nearbySpaces'

const NEARBY_ICONS: Record<string, ReactNode> = {
  'Urban park': <TreeIcon />,
  'Urban forest': <TreeIcon />,
  'Public plaza': <PlazaIcon />,
  Playground: <PlaygroundIcon />,
}

export function MapPage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [layerState, setLayerState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mapLayers.map((layer) => [layer.id, layer.defaultOn])),
  )
  const [selectedType, setSelectedType] = useState(sampleOpenSpaceTypes[0])
  const [district, setDistrict] = useState('district-d')
  const [range, setRange] = useState<[number, number]>([22, 85])
  const [adminLevel, setAdminLevel] = useState<'district' | 'sub-district'>('district')
  const [basemap, setBasemap] = useState(basemapOptions[0].value)

  const districtRow = getDistrictRow(district, year)!
  const { covered, notCovered } = getCoverage(districtRow)
  const { openSpaceSharePct, streetsPct, builtUpOpenPct } = getAreaIndicators(districtRow)

  return (
    <div className="flex min-h-0 flex-1">
      <SidePanel title={t.map.filtersTitle} collapsed={leftCollapsed} onToggleCollapse={() => setLeftCollapsed((v) => !v)}>
        <div className="mb-6">
          <SectionTitle>{t.map.layersSectionTitle}</SectionTitle>
          {mapLayers.map((layer) => (
            <div key={layer.id} className="flex items-center justify-between py-[7px]">
              <span className="flex items-center gap-2.5 text-[13.5px] text-ink">
                <LayerSwatch layer={layer} />
                {layer.label}
              </span>
              <Toggle
                checked={layerState[layer.id]}
                onChange={(checked) => setLayerState((current) => ({ ...current, [layer.id]: checked }))}
                label={layer.label}
              />
            </div>
          ))}
        </div>

        <div>
          <SectionTitle>{t.map.filtersSectionTitle}</SectionTitle>

          <div className="mb-3.5">
            <FieldLabel>{t.map.openSpaceTypeLabel}</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {sampleOpenSpaceTypes.map((type) => (
                <Chip key={type} label={type} selected={selectedType === type} onSelect={() => setSelectedType(type)} />
              ))}
            </div>
          </div>

          <div className="mb-3.5">
            <Select
              label={t.map.districtLabel}
              options={sampleDistrictOptions}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            />
          </div>

          <div className="mb-3.5">
            <FieldLabel>{t.map.accessibilityRangeLabel}</FieldLabel>
            <RangeSlider min={0} max={100} value={range} onChange={setRange} formatLabel={(v) => `${v}%`} />
          </div>

          <div className="mb-3.5">
            <FieldLabel>{t.map.adminLevelLabel}</FieldLabel>
            <SegmentedControl
              value={adminLevel}
              onChange={(value) => setAdminLevel(value as 'district' | 'sub-district')}
              options={[
                { value: 'district', label: t.adminLevel.district },
                { value: 'sub-district', label: t.adminLevel.subDistrict },
              ]}
            />
          </div>

          <div>
            <FieldLabel>{t.filters.year}</FieldLabel>
            <YearSelect years={years} value={year} onChange={setYear} />
          </div>
        </div>
      </SidePanel>

      <div className="relative flex-1 bg-card">
        <div className="absolute inset-4 flex items-center justify-center rounded-xl border border-dashed border-line-2 text-sm text-slate">
          {t.map.mapPlaceholder}
        </div>

        <SegmentedControl
          value={basemap}
          onChange={setBasemap}
          options={basemapOptions}
          className="absolute left-5 top-5 z-[5] w-auto shadow-card"
        />

        <div className="absolute right-5 top-5 z-[5] flex flex-col gap-2">
          <div className="flex flex-col overflow-hidden rounded-[9px] border border-line bg-white shadow-card">
            <button type="button" aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center border-b border-line text-ink">
              <PlusIcon />
            </button>
            <button type="button" aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center text-ink">
              <MinusIcon />
            </button>
          </div>
          <button type="button" aria-label="Fit to view" className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-white text-ink shadow-card">
            <FitIcon />
          </button>
        </div>

        <div className="absolute bottom-5 left-5 z-[5]">
          <Legend title={t.map.legendTitle} note={t.map.legendNote} steps={accessibilityLegendSteps} />
        </div>
      </div>

      <SidePanel
        title={t.map.areaDetailsTitle}
        side="right"
        width={380}
        collapsed={rightCollapsed}
        onToggleCollapse={() => setRightCollapsed((v) => !v)}
        footer={
          <>
            <Button variant="primary" fullWidth icon={<PlusIcon />}>
              {t.map.addToComparison}
            </Button>
            <p className="mt-2 text-center text-[10.5px] text-mist">{t.common.sampleDataTag}</p>
          </>
        }
      >
        <h2 className="text-xl font-bold text-ink">{districtRow.name}</h2>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-800">
          <GridIcon />
          {t.adminLevel.district} level
        </span>

        <div className="mt-[18px] flex items-center gap-[18px]">
          <DonutChart percent={districtRow.accessibilityPct} centerLabel={`${districtRow.accessibilityPct}%`} subLabel={t.map.ofResidents} />
          <p className="text-[12.5px] leading-[1.5] text-slate">{t.map.accessibilityDescription}</p>
        </div>

        <div className="mt-3.5 flex gap-2.5">
          <StatBox value={covered} label={t.map.coveredLabel} dotColor="var(--color-green-600)" />
          <StatBox value={notCovered} label={t.map.notCoveredLabel} dotColor="var(--color-accent-500)" />
        </div>

        <div className="mt-[18px]">
          <SectionTitle>{t.map.sdgSectionTitle}</SectionTitle>
          <ProgressBar className="mb-3" label={t.map.openSpaceShareLabel} valueLabel={`${openSpaceSharePct}%`} value={openSpaceSharePct} />
          <ProgressBar
            className="mb-3"
            label={t.map.streetsLabel}
            valueLabel={`${streetsPct}%`}
            value={streetsPct}
            color="var(--color-slate)"
          />
          <ProgressBar label={t.map.builtUpOpenLabel} valueLabel={`${builtUpOpenPct}%`} value={builtUpOpenPct} color="var(--color-accent-600)" />
        </div>

        <div className="mt-[18px]">
          <SectionTitle>{t.map.nearbySectionTitle}</SectionTitle>
          {nearbySpaces.map((space) => (
            <div key={space.id} className="flex items-center gap-2.5 border-t border-line py-[9px] first:border-t-0">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-green-100 text-green-700">
                {NEARBY_ICONS[space.type]}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-ink">{space.name}</div>
                <div className="text-[11px] text-slate">{space.type}</div>
              </div>
              <span className="ml-auto rounded-full bg-green-50 px-2 py-[3px] text-[11.5px] font-semibold text-green-700">
                {space.distanceM} m
              </span>
            </div>
          ))}
        </div>
      </SidePanel>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[.6px] text-mist">{children}</div>
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold text-slate">{children}</label>
}

function StatBox({ value, label, dotColor }: { value: number; label: string; dotColor: string }) {
  return (
    <div className="flex-1 rounded-[10px] border border-line px-3 py-[11px]">
      <div className="text-lg font-bold leading-[1.15] text-ink tabular-nums">{value.toLocaleString()}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate">
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: dotColor }} />
        {label}
      </div>
    </div>
  )
}

function LayerSwatch({ layer }: { layer: (typeof mapLayers)[number] }) {
  if (layer.variant === 'fill') return <span className="h-3 w-3 flex-none rounded-[3px]" style={{ background: layer.color }} />
  if (layer.variant === 'fill-soft')
    return <span className="h-3 w-3 flex-none rounded-[3px]" style={{ background: layer.color, opacity: 0.5 }} />
  if (layer.variant === 'outline')
    return <span className="h-3 w-3 flex-none rounded-[3px]" style={{ border: `2px solid ${layer.color}` }} />
  return <span className="h-3 w-3 flex-none rounded-[3px]" style={{ border: `1px dashed ${layer.color}` }} />
}

function TreeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="6" />
      <line x1="12" y1="15" x2="12" y2="21" />
    </svg>
  )
}

function PlazaIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PlaygroundIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v16M20 4v16M4 4h16" />
      <line x1="12" y1="4" x2="12" y2="14" />
      <circle cx="12" cy="17" r="2.4" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function FitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <line x1="12" y1="1.5" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22.5" y2="12" />
    </svg>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GeoJSON, MapContainer, Pane, ScaleControl, TileLayer, useMapEvents } from 'react-leaflet'
import { circleMarker } from 'leaflet'
import type { FitBoundsOptions, LatLng, LatLngBoundsExpression, LatLngTuple, Map as LeafletMap } from 'leaflet'
import type { Feature, GeometryObject, Point } from 'geojson'
import 'leaflet/dist/leaflet.css'
import {
  getDistrictFillOnlyStyle,
  getDistrictOutlineStyle,
  getNetworkStyle,
  getOpsPointStyle,
  getOpsTypeColor,
  getServiceAreaStyle,
  getSubDistrictStyle,
  zoomPadding,
} from '../config/mapStyle'
import { getMapData, getOpsAnalysis, type Bbox, type OpsAnalysis } from '../mock/mapData'
import { getDistrictFeature, getSubDistrictFeature } from '../mock/mapBoundaries'
import { OPS_TYPE_LABELS, type OpsPointProperties } from '../mock/opsPoints'
import { Chip } from '../components/ui/Chip'
import { DonutChart } from '../components/ui/DonutChart'
import { Legend } from '../components/ui/Legend'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RangeSlider } from '../components/ui/RangeSlider'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { SidePanel } from '../components/ui/SidePanel'
import { Toggle } from '../components/ui/Toggle'
import { TrendLine } from '../components/ui/TrendLine'
import { YearSelect } from '../components/ui/YearSelect'
import { Button } from '../components/ui/Button'
import { useLanguage } from '../i18n/LanguageContext'
import { useYear } from '../state/YearContext'
import { useArea } from '../state/AreaContext'
import type { AreaLevel } from '../mock/areas'
import { accessibilityLegendSteps } from '../mock/accessibilityLegend'
import { basemapOptions } from '../mock/basemaps'
import { areaHasAnyData, getAreaMeta, getAreaRow, getFirstAreaId, getMetricSeries } from '../mock/areaIndex'
import { getAreaIndicators, getCoverage } from '../mock/areas'
import { getDistrictOptions, sampleOpenSpaceTypes } from '../mock/districts'
import { getSubDistrictOptions } from '../mock/subdistricts'
import { mapLayers } from '../mock/mapLayers'
import { getNearbySpaces } from '../mock/nearbySpaces'

const NEARBY_ICONS: Record<string, ReactNode> = {
  'Urban park': <TreeIcon />,
  'Urban forest': <TreeIcon />,
  'Public plaza': <PlazaIcon />,
  Playground: <PlaygroundIcon />,
}

// Starting view + hard pan/zoom limits for the map. The bounds are a
// placeholder padded box around Bangkok; once district boundary data exists,
// these should derive from that extent instead of being hand-picked.
const BANGKOK_CENTER: LatLngTuple = [13.7563, 100.5018]
const BANGKOK_ZOOM = 11
const MAP_MIN_ZOOM = 10
const MAP_MAX_ZOOM = 19
const BANGKOK_MAX_BOUNDS: LatLngBoundsExpression = [
  [13.4, 100.2],
  [14.05, 101.05],
]
const MAX_BOUNDS_VISCOSITY = 0.8

// Used only for the brief window before the first real moveend-derived bbox
// arrives (the mock data ignores bbox entirely, so this is mostly cosmetic).
const FALLBACK_BBOX: Bbox = [100.2, 13.4, 101.05, 14.05]

// OPS analysis card layout. Below this map-area width, the card docks to the
// bottom as a sheet instead of the top-right corner.
const NARROW_MAP_BREAKPOINT = 640
// Caps how far "Zoom to service area" zooms in — a ~300-400 m-wide area
// doesn't need to go past neighborhood scale.
const ANALYSIS_MAX_ZOOM = 16

/** Keeps the service-area/network geometry clear of the docked analysis card, on whichever side it's docked to. */
function getAnalysisFitBoundsOptions(narrow: boolean): FitBoundsOptions {
  const padding = narrow ? zoomPadding.narrow : zoomPadding.wide
  return {
    paddingTopLeft: [padding.left, padding.top],
    paddingBottomRight: [padding.right, padding.bottom],
    maxZoom: ANALYSIS_MAX_ZOOM,
  }
}

type SavedView = { center: LatLng; zoom: number }
type OpsSelection = { opsId: string; mode: 'preview' | 'zoomed'; savedView: SavedView | null }

export function MapPage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()
  const { level, setLevel, districtId, setDistrictId, subDistrictId, setSubDistrictId } = useArea()

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [layerState, setLayerState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mapLayers.map((layer) => [layer.id, layer.defaultOn])),
  )
  const [selectedType, setSelectedType] = useState(sampleOpenSpaceTypes[0])
  const [range, setRange] = useState<[number, number]>([22, 85])
  const [basemap, setBasemap] = useState(basemapOptions[0].value)
  const activeBasemap = basemapOptions.find((option) => option.value === basemap) ?? basemapOptions[0]

  const mapRef = useRef<LeafletMap | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement | null>(null)
  // MapContainer's forwarded ref (mapRef) only resolves on a second render
  // pass (react-leaflet wires it up via state internally), so it's still
  // null during any mount-time effect here. This state, set from the
  // MapEventBridge child below (which reads the map via context instead),
  // is what mount-time effects that need the map instance should use.
  const [map, setMap] = useState<LeafletMap | null>(null)
  // Captured on every moveend; currently just feeds getMapData (which ignores
  // it), ready to drive a real bbox-filtered fetch once the backend exists.
  const [bbox, setBbox] = useState<Bbox | null>(null)
  const mapData = useMemo(() => getMapData(bbox ?? FALLBACK_BBOX), [bbox])

  // Drives the analysis card's docked-corner vs. bottom-sheet layout.
  const [mapAreaWidth, setMapAreaWidth] = useState(0)
  const isNarrowMapArea = mapAreaWidth > 0 && mapAreaWidth < NARROW_MAP_BREAKPOINT

  const isGisBasemap = basemap === 'gis'

  // One place for "which park, and are we just previewing it or zoomed into
  // its service area" — savedView is only ever set going into 'zoomed' and
  // only ever read coming back out of it, so manual panning/zooming while
  // zoomed can't drift it.
  const [selection, setSelection] = useState<OpsSelection | null>(null)
  const [analysisVisibility, setAnalysisVisibility] = useState({ network: true, serviceArea: true })

  const selectedOpsId = selection?.opsId
  const selectedOpsFeature = useMemo(
    () => (selectedOpsId ? mapData.opsPoints.features.find((feature) => feature.properties.id === selectedOpsId) : undefined),
    [mapData.opsPoints, selectedOpsId],
  )
  const selectedOpsAnalysis = useMemo<OpsAnalysis | undefined>(
    () => (selectedOpsId ? getOpsAnalysis(selectedOpsId, year) : undefined),
    [selectedOpsId, year],
  )
  const selectedSubDistrict = selectedOpsFeature && getSubDistrictFeature(selectedOpsFeature.properties.subdistrict_id)
  const selectedDistrict = selectedSubDistrict && getDistrictFeature(selectedSubDistrict.properties.district_id)
  const isZoomedIn = selection?.mode === 'zoomed'

  // Re-styles every OPS circle marker in place (via GeoJSON.setStyle) rather
  // than rebuilding the 300-point layer — the `data`/`pointToLayer` props
  // only apply once, at creation, but `style` is reactive.
  const opsPointStyle = useMemo(
    () => (feature?: Feature<GeometryObject, OpsPointProperties>) =>
      feature ? getOpsPointStyle(feature.properties.ops_type, feature.properties.id === selectedOpsId) : {},
    [selectedOpsId],
  )

  // Clicking a park only ever opens it in preview — it never moves the map.
  // If a different park was zoomed in, that view gets restored first so its
  // layers/padding don't linger under the newly selected park.
  function selectOps(id: string) {
    if (selection?.mode === 'zoomed' && selection.savedView) {
      mapRef.current?.setView(selection.savedView.center, selection.savedView.zoom)
    }
    setSelection({ opsId: id, mode: 'preview', savedView: null })
  }

  // The only way into 'zoomed': saves the view that was current right
  // before fitting to the service area, so it can be restored later.
  function handleZoomToServiceArea() {
    if (!selection || !selectedOpsAnalysis || !mapRef.current) return
    const currentMap = mapRef.current
    const savedView: SavedView = { center: currentMap.getCenter(), zoom: currentMap.getZoom() }
    const latLngs = selectedOpsAnalysis.serviceArea.coordinates.flat(2).map(([lon, lat]) => [lat, lon] as LatLngTuple)
    currentMap.fitBounds(latLngs, getAnalysisFitBoundsOptions(isNarrowMapArea))
    setAnalysisVisibility({ network: true, serviceArea: true })
    setSelection({ opsId: selection.opsId, mode: 'zoomed', savedView })
  }

  // Shared by the ×, Esc, and empty-map-click paths. Leaving 'zoomed' flies
  // back to the saved view and drops to 'preview' for the same park (so a
  // second close fully clears it); leaving 'preview' clears the selection.
  const closeOrExitZoom = useCallback(() => {
    if (!selection) return
    if (selection.mode === 'zoomed' && selection.savedView) {
      mapRef.current?.flyTo(selection.savedView.center, selection.savedView.zoom, { duration: 0.6 })
      setSelection({ opsId: selection.opsId, mode: 'preview', savedView: null })
    } else {
      setSelection(null)
    }
  }, [selection])

  // Resizes the map whenever its wrapper's box changes size — covers both
  // the left/right SidePanel collapse transitions and plain window resizes —
  // and tracks its width, which decides whether the analysis card docks to
  // the top-right corner or the bottom as a sheet.
  useEffect(() => {
    const wrapperEl = mapWrapperRef.current
    if (!map || !wrapperEl) return
    const resizeObserver = new ResizeObserver((entries) => {
      map.invalidateSize()
      setMapAreaWidth(entries[0].contentRect.width)
    })
    resizeObserver.observe(wrapperEl)
    return () => resizeObserver.disconnect()
  }, [map])

  const handleMoveEnd = useCallback((nextBbox: Bbox) => setBbox(nextBbox), [])

  // Escape closes the card (or exits 'zoomed' back to 'preview').
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeOrExitZoom()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeOrExitZoom])

  function handleZoomIn() {
    mapRef.current?.zoomIn()
  }

  function handleZoomOut() {
    mapRef.current?.zoomOut()
  }

  function handleResetView() {
    mapRef.current?.setView(BANGKOK_CENTER, BANGKOK_ZOOM)
  }

  const districtOptions = getDistrictOptions()
  const effectiveDistrictId = districtId === 'all' ? getFirstAreaId('district') : districtId
  const subDistrictOptions = [
    { value: 'all', label: t.filters.allSubDistricts },
    ...getSubDistrictOptions(effectiveDistrictId),
  ]

  const focusAreaId = level === 'sub-district' && subDistrictId !== 'all' ? subDistrictId : effectiveDistrictId
  const focusMeta = getAreaMeta(focusAreaId)
  const focusRow = getAreaRow(focusAreaId, year)
  const focusHasAnyData = areaHasAnyData(focusAreaId)
  const trendSeries = getMetricSeries(focusAreaId, 'accessibilityPct')

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
              options={districtOptions}
              value={effectiveDistrictId}
              onChange={(event) => setDistrictId(event.target.value)}
            />
          </div>

          {level === 'sub-district' && (
            <div className="mb-3.5">
              <Select
                label={t.filters.subDistrict}
                options={subDistrictOptions}
                value={subDistrictId}
                onChange={(event) => setSubDistrictId(event.target.value)}
              />
            </div>
          )}

          <div className="mb-3.5">
            <FieldLabel>{t.map.accessibilityRangeLabel}</FieldLabel>
            <RangeSlider min={0} max={100} value={range} onChange={setRange} formatLabel={(v) => `${v}%`} />
          </div>

          <div className="mb-3.5">
            <FieldLabel>{t.map.adminLevelLabel}</FieldLabel>
            <SegmentedControl
              value={level}
              onChange={(value) => setLevel(value as AreaLevel)}
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
        {/* isolate pins Leaflet's own pane/control z-indexes (200-1000) inside
            this box, so they can never out-stack the overlay sibling below. */}
        <div ref={mapWrapperRef} className="relative isolate z-0 h-full w-full">
          <MapContainer
            ref={mapRef}
            center={BANGKOK_CENTER}
            zoom={BANGKOK_ZOOM}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxBounds={BANGKOK_MAX_BOUNDS}
            maxBoundsViscosity={MAX_BOUNDS_VISCOSITY}
            zoomControl={false}
            scrollWheelZoom
            doubleClickZoom
            touchZoom
            preferCanvas
            className={isGisBasemap ? 'h-full w-full bg-white' : 'h-full w-full'}
          >
            {/* key forces a clean remount on basemap change, so the tile URL and attribution always swap together. */}
            {activeBasemap.tileUrl && (
              <TileLayer key={activeBasemap.value} url={activeBasemap.tileUrl} attribution={activeBasemap.attribution} />
            )}

            {/* Each layer gets its own always-mounted Pane with a fixed
                z-index, so bottom-to-top order (sub-district fill, service
                area, district outline, network lines, OPS points) holds no
                matter what sequence the toggles/selection are flipped in —
                only the Panes' children mount or unmount, never the Panes
                themselves. The district layer is split in two: its fill-only
                stand-in (when sub-district boundaries are off) sits at the
                same low tier as the sub-district fill, so its opaque gold
                doesn't cover the service-area/network layers above; its
                boundary line sits at the higher "district outline" tier. */}
            <Pane name="subdistrict-pane" style={{ zIndex: 401 }}>
              {layerState['subdistrict-boundaries'] && (
                <GeoJSON data={mapData.subDistricts} style={getSubDistrictStyle(isGisBasemap)} />
              )}
              {isGisBasemap && layerState['district-boundaries'] && !layerState['subdistrict-boundaries'] && (
                <GeoJSON data={mapData.districts} style={getDistrictFillOnlyStyle()} />
              )}
            </Pane>

            <Pane name="service-area-pane" style={{ zIndex: 402 }}>
              {isZoomedIn && selectedOpsAnalysis && analysisVisibility.serviceArea && (
                // Keyed by analysis id: GeoJSON's `data` prop only applies at
                // creation, so switching parks needs a clean remount to pick
                // up the new geometry.
                <GeoJSON key={selectedOpsAnalysis.analysis_id} data={selectedOpsAnalysis.serviceArea} style={getServiceAreaStyle()} />
              )}
            </Pane>

            <Pane name="district-pane" style={{ zIndex: 403 }}>
              {layerState['district-boundaries'] && <GeoJSON data={mapData.districts} style={getDistrictOutlineStyle()} />}
            </Pane>

            <Pane name="network-pane" style={{ zIndex: 404 }}>
              {isZoomedIn && selectedOpsAnalysis && analysisVisibility.network && (
                <GeoJSON key={selectedOpsAnalysis.analysis_id} data={selectedOpsAnalysis.network} style={getNetworkStyle()} />
              )}
            </Pane>

            <Pane name="ops-pane" style={{ zIndex: 405 }}>
              {layerState['open-spaces'] && (
                <GeoJSON
                  data={mapData.opsPoints}
                  style={opsPointStyle}
                  pointToLayer={(feature, latlng) =>
                    // A custom pointToLayer bypasses the GeoJSON layer's own pane option, so
                    // the target pane has to be set explicitly here too, or these fall back
                    // to the default overlayPane and render below the fills above them.
                    // bubblingMouseEvents: false keeps a marker click from also reaching the
                    // map's own click handler, which would immediately clear the selection.
                    circleMarker(latlng, {
                      ...getOpsPointStyle(feature.properties.ops_type, false),
                      pane: 'ops-pane',
                      bubblingMouseEvents: false,
                    })
                  }
                  eventHandlers={{
                    click: (event) => {
                      const feature = event.propagatedFrom?.feature as Feature<Point, OpsPointProperties> | undefined
                      if (feature) selectOps(feature.properties.id)
                    },
                  }}
                />
              )}
            </Pane>

            <ScaleControl position="bottomright" imperial={false} />

            <MapEventBridge onReady={setMap} onMoveEnd={handleMoveEnd} onClick={closeOrExitZoom} />
          </MapContainer>
        </div>

        {/* Sits above the map's stacking context; pointer-events-none here
            (restored per-control below) so empty space still lets drags/
            scroll-zoom reach the map underneath. */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {/* Basemap switcher and zoom controls share this top-left stack so
              the top-right corner stays free for the docked analysis card. */}
          <div className="pointer-events-auto absolute left-5 top-5 flex flex-col items-start gap-2">
            <SegmentedControl value={basemap} onChange={setBasemap} options={basemapOptions} className="w-auto shadow-card" />

            <div className="flex flex-col overflow-hidden rounded-[9px] border border-line bg-white shadow-card">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={handleZoomIn}
                className="flex h-9 w-9 items-center justify-center border-b border-line text-ink"
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={handleZoomOut}
                className="flex h-9 w-9 items-center justify-center text-ink"
              >
                <MinusIcon />
              </button>
            </div>
            <button
              type="button"
              aria-label="Reset view"
              onClick={handleResetView}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-line bg-white text-ink shadow-card"
            >
              <FitIcon />
            </button>
          </div>

          <div className="pointer-events-auto absolute bottom-5 left-5">
            <Legend title={t.map.legendTitle} note={t.map.legendNote} steps={accessibilityLegendSteps} />
          </div>

          {selectedOpsFeature && selectedOpsAnalysis && (
            <div
              className={`pointer-events-auto absolute overflow-y-auto rounded-xl bg-card shadow-card-lg ${
                isNarrowMapArea
                  ? 'inset-x-3 bottom-3 max-h-[70%]'
                  : 'right-5 top-5 w-[280px] max-h-[calc(100%-40px)]'
              }`}
            >
              <OpsPopupCard
                point={selectedOpsFeature}
                analysis={selectedOpsAnalysis}
                subDistrictName={selectedSubDistrict?.properties.name}
                districtName={selectedDistrict?.properties.name}
                mode={isZoomedIn ? 'zoomed' : 'preview'}
                visibility={analysisVisibility}
                onToggleVisibility={(key) => setAnalysisVisibility((current) => ({ ...current, [key]: !current[key] }))}
                onZoomToServiceArea={handleZoomToServiceArea}
                onClose={closeOrExitZoom}
              />
            </div>
          )}
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
        {focusMeta?.level === 'sub-district' && (
          <p className="mb-1 text-[11.5px] font-semibold text-slate">
            {focusMeta.parentName} <span className="text-mist">›</span> {focusMeta.name}
          </p>
        )}
        <h2 className="text-xl font-bold text-ink">{focusMeta?.name}</h2>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-800">
          <GridIcon />
          {focusMeta?.level === 'sub-district' ? t.adminLevel.subDistrict : t.adminLevel.district} level
        </span>

        {!focusRow ? (
          <div className="mt-[18px] rounded-lg border border-dashed border-line-2 p-4 text-center">
            <p className="text-[13px] font-semibold text-ink">{t.common.noDataTitle}</p>
            <p className="mt-1 text-[12px] text-slate">{t.common.noDataBody.replace('{year}', String(year))}</p>
          </div>
        ) : (
          <>
            <div className="mt-[18px] flex items-center gap-[18px]">
              <DonutChart percent={focusRow.accessibilityPct} centerLabel={`${focusRow.accessibilityPct}%`} subLabel={t.map.ofResidents} />
              <p className="text-[12.5px] leading-[1.5] text-slate">{t.map.accessibilityDescription}</p>
            </div>

            <div className="mt-3.5 flex gap-2.5">
              <StatBox value={getCoverage(focusRow).covered} label={t.map.coveredLabel} dotColor="var(--color-green-600)" />
              <StatBox value={getCoverage(focusRow).notCovered} label={t.map.notCoveredLabel} dotColor="var(--color-accent-500)" />
            </div>

            <div className="mt-[18px]">
              <SectionTitle>{t.map.sdgSectionTitle}</SectionTitle>
              <ProgressBar
                className="mb-3"
                label={t.map.openSpaceShareLabel}
                valueLabel={`${getAreaIndicators(focusRow).openSpaceSharePct}%`}
                value={getAreaIndicators(focusRow).openSpaceSharePct}
              />
              <ProgressBar
                className="mb-3"
                label={t.map.streetsLabel}
                valueLabel={`${getAreaIndicators(focusRow).streetsPct}%`}
                value={getAreaIndicators(focusRow).streetsPct}
                color="var(--color-slate)"
              />
              <ProgressBar
                label={t.map.builtUpOpenLabel}
                valueLabel={`${getAreaIndicators(focusRow).builtUpOpenPct}%`}
                value={getAreaIndicators(focusRow).builtUpOpenPct}
                color="var(--color-accent-600)"
              />
            </div>
          </>
        )}

        {focusHasAnyData && (
          <div className="mt-[18px]">
            <SectionTitle>{t.map.trendSectionTitle}</SectionTitle>
            <TrendLine points={trendSeries} highlightYears={[year]} />
          </div>
        )}

        <div className="mt-[18px]">
          <SectionTitle>{t.map.nearbySectionTitle}</SectionTitle>
          {getNearbySpaces(focusAreaId).map((space) => (
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

/**
 * Renders nothing — just a place to call react-leaflet's map hooks, which
 * read the map instance from context rather than MapContainer's forwarded
 * ref (unlike the ref, context is already populated by the time a child here
 * renders, so this is the reliable way to reach the map from a mount-time
 * effect in the parent).
 */
function MapEventBridge({
  onReady,
  onMoveEnd,
  onClick,
}: {
  onReady: (map: LeafletMap) => void
  onMoveEnd: (bbox: Bbox) => void
  onClick: () => void
}) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds()
      onMoveEnd([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()])
    },
    click: onClick,
  })

  useEffect(() => {
    onReady(map)
  }, [map, onReady])

  return null
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

function formatSqm(value: number): string {
  return `${value.toLocaleString()} m²`
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`
}

function formatSqKm(sqm: number): string {
  return `${(sqm / 1_000_000).toFixed(3)} km²`
}

type AnalysisVisibility = { network: boolean; serviceArea: boolean }
type OpsCardMode = 'preview' | 'zoomed'

function OpsPopupCard({
  point,
  analysis,
  subDistrictName,
  districtName,
  mode,
  visibility,
  onToggleVisibility,
  onZoomToServiceArea,
  onClose,
}: {
  point: Feature<Point, OpsPointProperties>
  analysis: OpsAnalysis
  subDistrictName?: string
  districtName?: string
  mode: OpsCardMode
  visibility: AnalysisVisibility
  onToggleVisibility: (key: keyof AnalysisVisibility) => void
  onZoomToServiceArea: () => void
  onClose: () => void
}) {
  const { properties } = point
  const isZoomed = mode === 'zoomed'
  return (
    <div className="w-full p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold leading-tight text-ink">{properties.name}</h3>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 -mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full text-mist hover:bg-black/5 hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className="inline-flex items-center rounded-full px-2 py-[3px] text-[10.5px] font-bold text-white"
          style={{ background: getOpsTypeColor(properties.ops_type) }}
        >
          {OPS_TYPE_LABELS[properties.ops_type]}
        </span>
        {(districtName || subDistrictName) && (
          <span className="truncate text-[11px] text-slate">
            {districtName}
            {districtName && subDistrictName && <span className="text-mist"> › </span>}
            {subDistrictName}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
        <PopupStat label="Area" value={formatSqm(properties.area_sqm)} />
        <PopupStat label="Opened" value={String(properties.opened_year)} />
        <PopupStat label="Agency" value={properties.agency} className="col-span-2" />
      </div>

      <div className="mt-3 border-t border-line pt-1">
        <div className="flex items-center justify-between py-1.5">
          <div>
            <div className="text-[12px] font-semibold text-ink">Network</div>
            <div className="text-[11px] text-slate">{formatKm(analysis.networkLengthM)} within 400 m</div>
          </div>
          {isZoomed && <Toggle checked={visibility.network} onChange={() => onToggleVisibility('network')} label="Network" />}
        </div>
        <div className="flex items-center justify-between py-1.5">
          <div>
            <div className="text-[12px] font-semibold text-ink">Service area</div>
            <div className="text-[11px] text-slate">
              {formatSqKm(analysis.serviceAreaSqm)} · {analysis.populationCovered.toLocaleString()} covered
            </div>
          </div>
          {isZoomed && (
            <Toggle checked={visibility.serviceArea} onChange={() => onToggleVisibility('serviceArea')} label="Service area" />
          )}
        </div>
      </div>

      {!isZoomed && (
        <Button variant="secondary" fullWidth className="mt-2.5 h-9 text-[12.5px]" onClick={onZoomToServiceArea}>
          Zoom to service area
        </Button>
      )}
    </div>
  )
}

function PopupStat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10.5px] uppercase tracking-[.4px] text-mist">{label}</div>
      <div className="truncate text-[12.5px] font-semibold text-ink">{value}</div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
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

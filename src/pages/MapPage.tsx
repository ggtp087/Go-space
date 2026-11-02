import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GeoJSON, MapContainer, Pane, ScaleControl, TileLayer, useMapEvents } from 'react-leaflet'
import { circleMarker } from 'leaflet'
import type { FitBoundsOptions, LatLng, LatLngBoundsExpression, LatLngTuple, Map as LeafletMap, PathOptions } from 'leaflet'
import type { Feature, GeometryObject, MultiPolygon, Point, Position } from 'geojson'
import 'leaflet/dist/leaflet.css'
import {
  getAllServiceAreasStyle,
  getDistrictFillOnlyStyle,
  getDistrictOutlineStyle,
  getHighlightStyle,
  getNetworkStyle,
  getOpsPointStyle,
  getOpsTypeColor,
  getServiceAreaStyle,
  getSubDistrictHaloStyle,
  getSubDistrictStyle,
  mapStyle,
  zoomPadding,
} from '../config/mapStyle'
import { getMapData, getOpsAnalysis, type Bbox, type OpsAnalysis } from '../mock/mapData'
import { bangkokOutlineRing, getDistrictFeature, getSubDistrictFeature } from '../mock/mapBoundaries'
import type { OpsPointProperties } from '../mock/opsPoints'
import { opsTypeFilterValues, opsTypeValues, type OpsTypeFilter } from '../config/opsTypes'
import { Chip } from '../components/ui/Chip'
import { DonutChart } from '../components/ui/DonutChart'
import { ProgressBar } from '../components/ui/ProgressBar'
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
import { basemapOptions } from '../mock/basemaps'
import { roundPct } from '../mock/areas'
import { BANGKOK_AREA_ID, areaHasAnyData, getAreaMeta, getAreaRow, getMetricSeries } from '../mock/assessmentResults'
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

function ringToLatLngs(ring: Position[]): LatLngTuple[] {
  return ring.map(([lon, lat]) => [lat, lon] as LatLngTuple)
}

/** The ring to fit the map to for the current district/sub-district selection — the sub-district if one's picked, else the district, else the whole Bangkok outline. */
function getAreaFitLatLngs(districtId: string, subDistrictId: string): LatLngTuple[] {
  if (subDistrictId !== 'all') {
    const feature = getSubDistrictFeature(subDistrictId)
    if (feature) return ringToLatLngs(feature.geometry.coordinates[0])
  }
  if (districtId !== 'all') {
    const feature = getDistrictFeature(districtId)
    // District geometry is a MultiPolygon (the union of its sub-districts) —
    // flatten every member polygon's outer ring, since fitBounds just needs
    // the full set of boundary points to compute its bounding box from.
    if (feature) return feature.geometry.coordinates.flatMap((polygon) => ringToLatLngs(polygon[0]))
  }
  return ringToLatLngs(bangkokOutlineRing)
}

type SavedView = { center: LatLng; zoom: number }
type OpsSelection = { opsId: string; mode: 'preview' | 'zoomed'; savedView: SavedView | null }

export function MapPage() {
  const { t } = useLanguage()
  const { year, setYear, years } = useYear()
  const { districtId, setDistrictId, subDistrictId, setSubDistrictId } = useArea()

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [layerState, setLayerState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mapLayers.map((layer) => [layer.id, layer.defaultOn])),
  )
  const [selectedType, setSelectedType] = useState<OpsTypeFilter>('all')
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

  const isWholeCity = districtId === 'all'
  const districtOptions = useMemo(
    () => [
      { value: 'all', label: t.dashboard.areaSelectAllLabel },
      ...mapData.districts.features.map((feature) => ({ value: feature.properties.id, label: feature.properties.name })),
    ],
    [mapData.districts, t.dashboard.areaSelectAllLabel],
  )
  const subDistrictOptions = useMemo(
    () => [
      { value: 'all', label: t.filters.allSubDistricts },
      ...mapData.subDistricts.features
        .filter((feature) => feature.properties.district_id === districtId)
        .map((feature) => ({ value: feature.properties.id, label: feature.properties.name })),
    ],
    [mapData.subDistricts, districtId, t.filters.allSubDistricts],
  )

  // Identifies the current filter combination — used to force the ops/
  // service-area GeoJSON layers (whose `data` prop only applies at
  // creation) to remount when the visible set actually changes.
  const visibleOpsFilterKey = `${selectedType}-${districtId}-${subDistrictId}`

  // A point belongs to an area by its subdistrict_id → district_id — the
  // same join the real primary_subdistrict_id column would drive. Kept
  // separate from the type filter below (rather than one combined check) so
  // effects further down can tell "excluded by area" from "excluded by
  // type" apart — those two need different camera behavior when they drop
  // the currently-selected park.
  const visibleByAreaIdSet = useMemo(() => {
    const subDistrictIdsInDistrict =
      !isWholeCity && subDistrictId === 'all'
        ? new Set(mapData.subDistricts.features.filter((f) => f.properties.district_id === districtId).map((f) => f.properties.id))
        : null

    const ids = mapData.opsPoints.features
      .filter((feature) => {
        if (subDistrictId !== 'all') return feature.properties.subdistrict_id === subDistrictId
        if (subDistrictIdsInDistrict) return subDistrictIdsInDistrict.has(feature.properties.subdistrict_id)
        return true
      })
      .map((feature) => feature.properties.id)
    return new Set(ids)
  }, [mapData.opsPoints, mapData.subDistricts, districtId, subDistrictId, isWholeCity])

  // Combines (AND) with the open-space type chips.
  const visibleOpsPoints = useMemo(() => {
    const features = mapData.opsPoints.features.filter(
      (feature) =>
        visibleByAreaIdSet.has(feature.properties.id) && (selectedType === 'all' || feature.properties.ops_type === selectedType),
    )
    return { ...mapData.opsPoints, features }
  }, [mapData.opsPoints, visibleByAreaIdSet, selectedType])

  // The district/sub-district boundary currently selected — highlighted on
  // the map regardless of the boundary-toggle state.
  const highlightFeature = useMemo(() => {
    if (subDistrictId !== 'all') return getSubDistrictFeature(subDistrictId)
    if (districtId !== 'all') return getDistrictFeature(districtId)
    return undefined
  }, [districtId, subDistrictId])

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
  // only apply once, at creation, but `style` is reactive. Points the area/
  // type filters exclude are styled invisible (radius 0) rather than
  // removed from `data`, for the same reason: removing them would need a
  // remount, which would also reset every marker's selection highlight.
  const visibleOpsIdSet = useMemo(
    () => new Set(visibleOpsPoints.features.map((feature) => feature.properties.id)),
    [visibleOpsPoints],
  )
  const opsPointStyle = useMemo(
    () => (feature?: Feature<GeometryObject, OpsPointProperties>) => {
      if (!feature) return {}
      if (!visibleOpsIdSet.has(feature.properties.id)) return { radius: 0, weight: 0, fillOpacity: 0, opacity: 0 }
      return getOpsPointStyle(feature.properties.ops_type, feature.properties.id === selectedOpsId)
    },
    [selectedOpsId, visibleOpsIdSet],
  )

  // "400 m service areas": every currently-visible park's own service area,
  // combined into one MultiPolygon so it's a single layer. Recomputing
  // getOpsAnalysis per point is mock-only work (pure trig, no layout), fine
  // for the few dozen points a filtered view typically has.
  const allServiceAreas = useMemo<MultiPolygon | null>(() => {
    if (!layerState['service-areas']) return null
    const polygons = visibleOpsPoints.features
      .map((feature) => getOpsAnalysis(feature.properties.id, year))
      .filter((analysis): analysis is OpsAnalysis => Boolean(analysis))
      .map((analysis) => analysis.serviceArea.coordinates[0])
    if (polygons.length === 0) return null
    return { type: 'MultiPolygon', coordinates: polygons }
  }, [layerState, visibleOpsPoints, year])

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

  // Mirrors `selection` for the area-fit effect below, which deliberately
  // doesn't list `selection` as a dependency (it must NOT re-fit the map
  // just because a park was selected/deselected — only when the area filter
  // itself changes) but still needs the current value when it does run.
  const selectionRef = useRef<OpsSelection | null>(null)
  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  // Changing the district/sub-district filter always re-fits the map to the
  // newly selected area (Bangkok outline for "all"). If that also drops the
  // selected park, the selection is cleared outright — the fit below is the
  // only camera move needed, no separate saved-view restore. Otherwise,
  // being zoomed in is dropped back to preview (the new area fit replaces
  // that view). Reads `selection` via the ref above rather than listing it
  // as a dependency — this must fire only when the area filter changes.
  useEffect(() => {
    if (!map) return
    const current = selectionRef.current
    if (current) {
      if (!visibleByAreaIdSet.has(current.opsId)) {
        setSelection(null)
      } else if (current.mode === 'zoomed') {
        setSelection({ opsId: current.opsId, mode: 'preview', savedView: null })
      }
    }
    map.fitBounds(getAreaFitLatLngs(districtId, subDistrictId), { padding: [40, 40] })
  }, [map, districtId, subDistrictId, visibleByAreaIdSet])

  // Changing the open-space type filter closes the card the normal way
  // (restoring the saved view if it was zoomed in) when it alone drops the
  // selected park — i.e. the park is still within the current area, just
  // not this type. Area-driven drops are handled above instead, since
  // those also need to move the camera to the new area rather than restore
  // the old one.
  useEffect(() => {
    const current = selectionRef.current
    if (!current) return
    if (!visibleByAreaIdSet.has(current.opsId) || visibleOpsIdSet.has(current.opsId)) return
    if (current.mode === 'zoomed' && current.savedView) {
      mapRef.current?.flyTo(current.savedView.center, current.savedView.zoom, { duration: 0.6 })
    }
    setSelection(null)
  }, [visibleOpsIdSet, visibleByAreaIdSet])

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

  // "All districts" → Bangkok-wide; a sub-district if one's picked, else the
  // district if one's picked, else Bangkok again.
  const focusAreaId = isWholeCity ? BANGKOK_AREA_ID : subDistrictId !== 'all' ? subDistrictId : districtId
  const focusMeta = getAreaMeta(focusAreaId)
  const focusRow = getAreaRow(focusAreaId, year)
  const focusHasAnyData = areaHasAnyData(focusAreaId)
  const trendSeries = getMetricSeries(focusAreaId, 'access_pct')

  const districtLayer = mapLayers.find((layer) => layer.id === 'district-boundaries')
  const subDistrictLayer = mapLayers.find((layer) => layer.id === 'subdistrict-boundaries')
  const openSpacesLayer = mapLayers.find((layer) => layer.id === 'open-spaces')
  const serviceAreasLayer = mapLayers.find((layer) => layer.id === 'service-areas')

  // Only what's actually drawn right now — not just what's toggled on, so
  // e.g. a service-areas toggle with zero visible points doesn't still list
  // a swatch for nothing.
  const legendRows: { id: string; label: string; swatch: ReactNode }[] = []
  if (layerState['open-spaces'] && visibleOpsPoints.features.length > 0 && openSpacesLayer) {
    legendRows.push({ id: 'open-spaces', label: openSpacesLayer.label, swatch: <OpsTypeSwatch /> })
  }
  const zoomedServiceAreaVisible = isZoomedIn && selectedOpsAnalysis && analysisVisibility.serviceArea
  if ((allServiceAreas || zoomedServiceAreaVisible) && serviceAreasLayer) {
    legendRows.push({ id: 'service-areas', label: serviceAreasLayer.label, swatch: <StyleSwatch style={getAllServiceAreasStyle()} /> })
  }
  if (layerState['district-boundaries'] && districtLayer) {
    legendRows.push({
      id: 'district-boundaries',
      label: districtLayer.label,
      swatch: (
        <StyleSwatch
          style={{
            color: mapStyle.district.color,
            weight: mapStyle.district.weight,
            fill: isGisBasemap,
            fillColor: mapStyle.district.fillColor,
            fillOpacity: mapStyle.district.fillOpacity,
          }}
        />
      ),
    })
  }
  if (layerState['subdistrict-boundaries'] && subDistrictLayer) {
    legendRows.push({
      id: 'subdistrict-boundaries',
      label: subDistrictLayer.label,
      swatch: <StyleSwatch style={getSubDistrictStyle(isGisBasemap)} />,
    })
  }
  if (isZoomedIn && selectedOpsAnalysis && analysisVisibility.network) {
    legendRows.push({ id: 'network', label: t.map.networkLegendLabel, swatch: <StyleSwatch style={getNetworkStyle()} /> })
  }

  return (
    <div className="flex min-h-0 flex-1">
      <SidePanel title={t.map.filtersTitle} collapsed={leftCollapsed} onToggleCollapse={() => setLeftCollapsed((v) => !v)}>
        <div className="mb-6">
          <SectionTitle>{t.map.layersSectionTitle}</SectionTitle>
          {mapLayers
            .filter((layer) => layer.enabled)
            .map((layer) => (
              <div key={layer.id} className="flex items-center justify-between py-[7px]">
                <span className="flex items-center gap-2.5 text-[13.5px] text-ink">
                  <LayerSwatch layerId={layer.id} isGisBasemap={isGisBasemap} />
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
              {opsTypeFilterValues.map((value) => (
                <Chip
                  key={value}
                  label={t.map.opsTypes[value]}
                  selected={selectedType === value}
                  onSelect={() => setSelectedType(value)}
                  swatchColor={value === 'all' ? undefined : getOpsTypeColor(value)}
                />
              ))}
            </div>
          </div>

          <div className="mb-3.5">
            <Select
              label={t.map.districtLabel}
              options={districtOptions}
              value={districtId}
              onChange={(event) => setDistrictId(event.target.value)}
            />
          </div>

          <div className="mb-3.5">
            <Select
              label={t.filters.subDistrict}
              options={subDistrictOptions}
              value={subDistrictId}
              onChange={(event) => setSubDistrictId(event.target.value)}
              disabled={isWholeCity}
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
                area, district outline, network lines, highlight, OPS points)
                holds no matter what sequence the toggles/selection are
                flipped in — only the Panes' children mount or unmount, never
                the Panes themselves. The district layer is split in two: its
                fill-only stand-in (when sub-district boundaries are off)
                sits at the same low tier as the sub-district fill, so its
                opaque gold doesn't cover the service-area/network layers
                above; its boundary line sits at the higher "district
                outline" tier.
                ops-pane is deliberately the ONLY interactive pane, and the
                topmost one: every other pane here gets pointer-events: none
                on its container, so its canvas (preferCanvas gives each pane
                its own full-map-size canvas, drawn on or not) never
                intercepts a click meant for an OPS point beneath it — the
                corresponding `interactive: false` on each layer's style is
                belt-and-suspenders for Leaflet's own hit-testing, but
                pointer-events is what actually makes the click fall through
                to the pane below at the browser level. */}
            <Pane name="subdistrict-pane" style={{ zIndex: 401, pointerEvents: 'none' }}>
              {layerState['subdistrict-boundaries'] && !isGisBasemap && (
                <GeoJSON data={mapData.subDistricts} style={getSubDistrictHaloStyle()} />
              )}
              {layerState['subdistrict-boundaries'] && (
                <GeoJSON data={mapData.subDistricts} style={getSubDistrictStyle(isGisBasemap)} />
              )}
              {isGisBasemap && layerState['district-boundaries'] && !layerState['subdistrict-boundaries'] && (
                <GeoJSON data={mapData.districts} style={getDistrictFillOnlyStyle()} />
              )}
            </Pane>

            <Pane name="all-service-areas-pane" style={{ zIndex: 402, pointerEvents: 'none' }}>
              {allServiceAreas && (
                // Keyed by the actual filter values (not e.g. a point count,
                // which two different same-size filtered sets could share)
                // so GeoJSON's otherwise-inert `data` prop remounts whenever
                // the visible set actually changes.
                <GeoJSON key={visibleOpsFilterKey} data={allServiceAreas} style={getAllServiceAreasStyle()} />
              )}
            </Pane>

            <Pane name="service-area-pane" style={{ zIndex: 403, pointerEvents: 'none' }}>
              {isZoomedIn && selectedOpsAnalysis && analysisVisibility.serviceArea && (
                // Keyed by analysis id: GeoJSON's `data` prop only applies at
                // creation, so switching parks needs a clean remount to pick
                // up the new geometry.
                <GeoJSON key={selectedOpsAnalysis.analysis_id} data={selectedOpsAnalysis.serviceArea} style={getServiceAreaStyle()} />
              )}
            </Pane>

            <Pane name="district-pane" style={{ zIndex: 404, pointerEvents: 'none' }}>
              {layerState['district-boundaries'] && <GeoJSON data={mapData.districts} style={getDistrictOutlineStyle()} />}
            </Pane>

            <Pane name="network-pane" style={{ zIndex: 405, pointerEvents: 'none' }}>
              {isZoomedIn && selectedOpsAnalysis && analysisVisibility.network && (
                <GeoJSON key={selectedOpsAnalysis.analysis_id} data={selectedOpsAnalysis.network} style={getNetworkStyle()} />
              )}
            </Pane>

            <Pane name="highlight-pane" style={{ zIndex: 406, pointerEvents: 'none' }}>
              {highlightFeature && <GeoJSON key={highlightFeature.properties.id} data={highlightFeature} style={getHighlightStyle()} />}
            </Pane>

            <Pane name="ops-pane" style={{ zIndex: 407 }}>
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
                      if (feature && visibleOpsIdSet.has(feature.properties.id)) selectOps(feature.properties.id)
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

          {legendRows.length > 0 && (
            <div className="pointer-events-auto absolute bottom-5 left-5">
              <MapLegendCard title={t.map.activeLayersLegendTitle} rows={legendRows} />
            </div>
          )}

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
                typeLabel={t.map.opsTypes[selectedOpsFeature.properties.ops_type]}
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
        {subDistrictId !== 'all' && !isWholeCity && (
          <p className="mb-1 text-[11.5px] font-semibold text-slate">
            {focusMeta?.parentName} <span className="text-mist">›</span> {focusMeta?.name}
          </p>
        )}
        <h2 className="text-xl font-bold text-ink">{isWholeCity ? t.map.bangkokLabel : focusMeta?.name}</h2>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-800">
          <GridIcon />
          {isWholeCity
            ? t.map.bangkokLabel
            : `${subDistrictId !== 'all' ? t.adminLevel.subDistrict : t.adminLevel.district} level`}
        </span>

        {!focusRow ? (
          <div className="mt-[18px] rounded-lg border border-dashed border-line-2 p-4 text-center">
            <p className="text-[13px] font-semibold text-ink">{t.common.noDataTitle}</p>
            <p className="mt-1 text-[12px] text-slate">{t.common.noDataBody.replace('{year}', String(year))}</p>
          </div>
        ) : (
          <>
            <div className="mt-[18px] flex items-center gap-[18px]">
              <DonutChart percent={focusRow.access_pct} centerLabel={`${Math.round(focusRow.access_pct)}%`} subLabel={t.map.ofResidents} />
              <p className="text-[12.5px] leading-[1.5] text-slate">{t.map.accessibilityDescription}</p>
            </div>

            <div className="mt-3.5 flex gap-2.5">
              <StatBox value={Math.round(focusRow.population_with_access)} label={t.map.coveredLabel} dotColor="var(--color-green-600)" />
              <StatBox
                value={Math.round(focusRow.total_population - focusRow.population_with_access)}
                label={t.map.notCoveredLabel}
                dotColor="var(--color-accent-500)"
              />
            </div>

            <div className="mt-[18px]">
              <SectionTitle>{t.map.sdgSectionTitle}</SectionTitle>
              <ProgressBar
                label={t.map.openSpaceShareLabel}
                valueLabel={`${roundPct(focusRow.share_ops_pct)}%`}
                value={focusRow.share_ops_pct}
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
  typeLabel,
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
  typeLabel: string
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
          {typeLabel}
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

/**
 * Renders a Leaflet PathOptions object as a small swatch — border from
 * color/weight/dashArray, fill from fillColor/fillOpacity — so it can never
 * drift from what's actually drawn on the map (no hand-picked hex here).
 */
function StyleSwatch({ style }: { style: PathOptions }) {
  const weight = typeof style.weight === 'number' ? style.weight : 1
  const borderWidth = Math.max(1, Math.round(weight))
  const hasFill = style.fill !== false && Boolean(style.fillColor)
  return (
    <span
      className="relative h-3 w-3 flex-none overflow-hidden rounded-[3px]"
      style={{ border: `${borderWidth}px ${style.dashArray ? 'dashed' : 'solid'} ${style.color ?? 'transparent'}` }}
    >
      {hasFill && (
        <span className="absolute inset-0" style={{ background: style.fillColor as string, opacity: (style.fillOpacity as number) ?? 1 }} />
      )}
    </span>
  )
}

/** The 4 OPS type colors as a small dot cluster — used wherever "public green & open spaces" as a whole needs one swatch. */
function OpsTypeSwatch() {
  return (
    <span className="grid h-3 w-3 flex-none grid-cols-2 grid-rows-2 gap-[1px]">
      {opsTypeValues.map((type) => (
        <span key={type} className="rounded-full" style={{ background: getOpsTypeColor(type) }} />
      ))}
    </span>
  )
}

/** Resolves the right swatch for a sidebar layer id — district/sub-district read mapStyle directly so GIS vs. OSM/Satellite (filled vs. outline-only) always matches what's drawn. */
function LayerSwatch({ layerId, isGisBasemap }: { layerId: string; isGisBasemap: boolean }) {
  if (layerId === 'open-spaces') return <OpsTypeSwatch />
  if (layerId === 'service-areas') return <StyleSwatch style={getAllServiceAreasStyle()} />
  if (layerId === 'subdistrict-boundaries') return <StyleSwatch style={getSubDistrictStyle(isGisBasemap)} />
  if (layerId === 'district-boundaries') {
    return (
      <StyleSwatch
        style={{
          color: mapStyle.district.color,
          weight: mapStyle.district.weight,
          fill: isGisBasemap,
          fillColor: mapStyle.district.fillColor,
          fillOpacity: mapStyle.district.fillOpacity,
        }}
      />
    )
  }
  return null
}

function MapLegendCard({ title, rows }: { title: string; rows: { id: string; label: string; swatch: ReactNode }[] }) {
  return (
    <div className="w-[220px] rounded-xl border border-line bg-card p-[14px_16px] shadow-card">
      <p className="mb-2 text-xs font-bold text-ink">{title}</p>
      <div className="flex flex-col gap-[7px]">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 text-[12px] text-slate">
            {row.swatch}
            {row.label}
          </div>
        ))}
      </div>
    </div>
  )
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

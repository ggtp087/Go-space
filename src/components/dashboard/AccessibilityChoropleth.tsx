import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, Marker, Pane, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { Layer, LatLngTuple } from 'leaflet'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { getAccessibilityColor, getChoroplethSelectionStyle, getChoroplethStyle, getColoredHighlightStyle } from '../../config/mapStyle'
import {
  bangkokBoundaryPositions,
  bangkokOutline,
  getDistrictFeature,
  getSubDistrictFeature,
  mockDistrictBoundaries,
  mockSubDistrictBoundaries,
  multiPolygonBounds,
} from '../../mock/mapBoundaries'
import { BANGKOK_AREA_ID, getAreaMeta, getAssessmentResult } from '../../mock/assessmentResults'
import { formatPct, localizedName } from '../../mock/areas'
import { MIN_LABEL_FOOTPRINT_PX, escapeLabelText, estimateLabelBox, findPolygonInteriorPoint, labelBoxesOverlap, type LabelBox } from '../map/labelPlacement'
import type { Language } from '../../i18n/LanguageContext'
import type { Year } from '../../mock/years'

// The ranking-selection outline (item 10): a thicker, darker stroke than the
// ordinary district/sub-district boundary — matches the "selected" tone used
// elsewhere on the map (e.g. a selected OPS point's ring), not the red
// used for the single-area selection highlight.
const SELECTION_OUTLINE_COLOR = '#111827'
const SELECTION_OUTLINE_WEIGHT = 3

type AccessibilityChoroplethProps = {
  districtId: string
  subDistrictId: string
  year: Year
  className?: string
  /**
   * Extra per-area outlines in arbitrary colors, drawn above the base
   * choropleth — for Compare's several selected areas (a district/
   * sub-district id, or BANGKOK_AREA_ID for the whole city outline).
   * Independent of districtId/subDistrictId's own single-highlight above;
   * Compare passes districtId="all" to get the plain district-level
   * background and just adds these.
   */
  highlights?: { id: string; color: string }[]
  /**
   * Dashboard's interactive mode: a hover tooltip (name/accessibility/
   * population) and click-to-drill-down. Off by default, so Compare's small
   * read-only map is unaffected — its highlighted areas aren't meant to be
   * clicked or hovered for more detail.
   */
  interactive?: boolean
  onSelectArea?: (id: string) => void
  /** Non-empty set: every area NOT in it is faded — the Dashboard legend's "highlight this class" toggle. null/undefined: no fade. Takes priority over `selectionIds` when both are set. */
  highlightIds?: Set<string> | null
  /** Non-empty set (and `highlightIds` not active): areas in it get a thicker dark outline (the ranking chart's current row set); areas outside it fade slightly. null/undefined: no effect. */
  selectionIds?: Set<string> | null
  /** Fit bounds to these areas' own combined extent instead of districtId's — for Compare's map, which must frame every compared area (possibly a mix of levels), not just one district/city scope. */
  fitToIds?: string[]
  /** 'plain' (Dashboard): no border, explicit white background. 'bordered' (default, Compare): the original dashed-border look. */
  variant?: 'bordered' | 'plain'
  language?: Language
  /** Localized "people" unit word for the hover tooltip's population line — unused when `interactive` is false. */
  peopleLabel?: string
}

/** Bangkok isn't a polygon feature like a district/sub-district — this wraps its outline as one so it can share the same GeoJSON rendering path. */
function resolveAreaFeature(id: string): Feature<Polygon | MultiPolygon, { id: string }> | undefined {
  if (id === BANGKOK_AREA_ID) {
    return { type: 'Feature', properties: { id }, geometry: bangkokOutline }
  }
  return getDistrictFeature(id) ?? getSubDistrictFeature(id)
}

function positionsToLatLngs(positions: Position[]): LatLngTuple[] {
  return positions.map(([lon, lat]) => [lat, lon] as LatLngTuple)
}

function getDistrictFitLatLngs(districtId: string): LatLngTuple[] {
  if (districtId === 'all') return positionsToLatLngs(bangkokBoundaryPositions)
  const feature = getDistrictFeature(districtId)
  if (!feature) return positionsToLatLngs(bangkokBoundaryPositions)
  return feature.geometry.coordinates.flatMap((polygon) => positionsToLatLngs(polygon[0]))
}

/**
 * Combined outer-ring positions of every given area (district/sub-district/
 * Bangkok) — for fitting bounds around a mixed-level set like Compare's
 * selection. Every admin boundary here is actually a MultiPolygon (the union
 * type is just this function's return type being generic); cast
 * accordingly, same assumption getDistrictFitLatLngs already makes for a
 * single feature.
 */
function getCombinedAreaFitLatLngs(ids: string[]): LatLngTuple[] {
  const positions = ids.flatMap((id) => {
    const feature = resolveAreaFeature(id)
    if (!feature) return []
    const coordinates = feature.geometry.coordinates as Position[][][]
    return coordinates.flatMap((polygon) => polygon[0])
  })
  return positions.length > 0 ? positionsToLatLngs(positions) : positionsToLatLngs(bangkokBoundaryPositions)
}

/**
 * Compare's "fit to these areas" — zoomed in tight only when every area
 * belongs to the same single district (that district itself, or its
 * sub-districts); areas spread across more than one district, or including
 * Bangkok itself, read better fit to the whole city than cropped to their
 * own combined — and often oddly shaped or off-center — bounding box.
 */
function getAreasFitLatLngs(ids: string[]): LatLngTuple[] {
  if (ids.length === 0) return positionsToLatLngs(bangkokBoundaryPositions)
  const scopeKeys = new Set(
    ids.map((id) => (id === BANGKOK_AREA_ID ? BANGKOK_AREA_ID : (getSubDistrictFeature(id)?.properties.district_id ?? id))),
  )
  if (scopeKeys.size > 1 || scopeKeys.has(BANGKOK_AREA_ID)) {
    return positionsToLatLngs(bangkokBoundaryPositions)
  }
  return getCombinedAreaFitLatLngs(ids)
}

/** Raw HTML goes into Leaflet's bindTooltip — every value here is our own mock data, but escaping on principle keeps this safe if that ever changes. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * A small choropleth, shared by the Dashboard and Compare — reuses the Map
 * page's boundary data (mock/mapBoundaries.ts) and style tokens
 * (config/mapStyle.ts) rather than copying them, but is its own component
 * since its fill (by access_pct) and scope (districts, or one district's
 * sub-districts) aren't the main Map page's concern. Non-interactive by
 * default (Compare's usage): interactive: false on every style, pointer-
 * events: none on every pane, the only interaction is zoom. Dashboard opts
 * into `interactive` for a hover tooltip and click-to-drill-down — those
 * still only ever touch this component's own panes, never the main Map
 * page's pointer-events-none convention for its OPS-pane-only interactivity.
 */
export function AccessibilityChoropleth({
  districtId,
  subDistrictId,
  year,
  className = '',
  highlights,
  interactive = false,
  onSelectArea,
  highlightIds,
  selectionIds,
  fitToIds,
  variant = 'bordered',
  language = 'en',
  peopleLabel = 'people',
}: AccessibilityChoroplethProps) {
  const isWholeCity = districtId === 'all'
  const level: 'district' | 'sub-district' = isWholeCity ? 'district' : 'sub-district'

  const areaFeatureCollection = useMemo<FeatureCollection<Polygon | MultiPolygon, { id: string }>>(
    () => ({
      type: 'FeatureCollection',
      features: isWholeCity
        ? mockDistrictBoundaries.features
        : mockSubDistrictBoundaries.features.filter((feature) => feature.properties.district_id === districtId),
    }),
    [isWholeCity, districtId],
  )

  // A separate, richer-typed memo from areaFeatureCollection above (whose own
  // properties are narrowed to just { id }) — name/name_th/area_sqm are
  // needed for the label layer, and each feature's interior-point anchor is
  // computed once here (keyed on the same feature set), not per zoom/move.
  const labelFeatures = useMemo<ChoroplethLabelFeature[]>(() => {
    const features = isWholeCity
      ? mockDistrictBoundaries.features
      : mockSubDistrictBoundaries.features.filter((feature) => feature.properties.district_id === districtId)
    return features.map((feature) => ({
      id: feature.properties.id,
      name: feature.properties.name,
      name_th: feature.properties.name_th,
      area_sqm: feature.properties.area_sqm,
      coordinates: feature.geometry.coordinates,
      anchor: findPolygonInteriorPoint(feature.geometry.coordinates),
    }))
  }, [isWholeCity, districtId])

  const bandActive = !!highlightIds && highlightIds.size > 0
  const selectionActive = !bandActive && !!selectionIds && selectionIds.size > 0

  const areaStyle = useMemo(
    () =>
      (feature?: Feature<Geometry, { id: string }>) => {
        if (!feature) return {}
        const id = feature.properties.id
        const stats = getAssessmentResult(id, year)
        const fillColor = getAccessibilityColor(stats?.access_pct ?? 0)
        if (bandActive) {
          const isFaded = !highlightIds!.has(id)
          return getChoroplethStyle(fillColor, { interactive, fillOpacity: isFaded ? 0.15 : 0.85 })
        }
        if (selectionActive) {
          const inSelection = selectionIds!.has(id)
          return getChoroplethStyle(fillColor, {
            interactive,
            fillOpacity: inSelection ? 0.85 : 0.45,
            weight: inSelection ? SELECTION_OUTLINE_WEIGHT : undefined,
            color: inSelection ? SELECTION_OUTLINE_COLOR : undefined,
          })
        }
        return getChoroplethStyle(fillColor, { interactive, fillOpacity: 0.85 })
      },
    [year, interactive, bandActive, highlightIds, selectionActive, selectionIds],
  )

  // Tooltip binding + click handling are set up once per GeoJSON mount (not
  // reactive like `style`), so the key below includes year/language too —
  // not just level/districtId — or a hover tooltip could show a stale
  // year's numbers or the other language's name after a switch.
  const onEachFeature = useMemo(() => {
    if (!interactive) return undefined
    return (feature: Feature<Geometry, { id: string }>, layer: Layer) => {
      const id = feature.properties.id
      const meta = getAreaMeta(id, language)
      const stats = getAssessmentResult(id, year)
      if (meta && stats) {
        layer.bindTooltip(
          `<div class="choropleth-tooltip-name">${escapeHtml(meta.name)}</div><div>${formatPct(stats.access_pct)} · ${Math.round(
            stats.total_population,
          ).toLocaleString()} ${escapeHtml(peopleLabel)}</div>`,
          { sticky: true, direction: 'top', opacity: 1, className: 'choropleth-tooltip' },
        )
      }
      layer.on('click', () => onSelectArea?.(id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, year, language, peopleLabel])

  const highlightFeature = !isWholeCity && subDistrictId !== 'all' ? mockSubDistrictBoundaries.features.find((f) => f.properties.id === subDistrictId) : undefined

  const fitLatLngs = useMemo(
    () => (fitToIds && fitToIds.length > 0 ? getAreasFitLatLngs(fitToIds) : getDistrictFitLatLngs(districtId)),
    [fitToIds, districtId],
  )

  const wrapperClass =
    variant === 'plain' ? 'overflow-hidden rounded-lg' : 'overflow-hidden rounded-lg border border-dashed border-line-2'

  return (
    <div className={`${wrapperClass} ${className}`}>
      <MapContainer
        center={[13.7563, 100.5018]}
        zoom={10}
        zoomControl
        scrollWheelZoom={false}
        doubleClickZoom
        dragging
        preferCanvas
        className="h-full w-full"
        style={{ background: '#ffffff' }}
      >
        <Pane name="choropleth-areas-pane" style={{ zIndex: 401, pointerEvents: interactive ? 'auto' : 'none' }}>
          <GeoJSON
            key={`${level}-${districtId}-${year}-${language}`}
            data={areaFeatureCollection}
            style={areaStyle}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="choropleth-highlight-pane" style={{ zIndex: 402, pointerEvents: 'none' }}>
          {highlightFeature && <GeoJSON key={highlightFeature.properties.id} data={highlightFeature} style={getChoroplethSelectionStyle()} />}
        </Pane>
        <Pane name="choropleth-multi-highlight-pane" style={{ zIndex: 403, pointerEvents: 'none' }}>
          {highlights?.map((highlight) => {
            const feature = resolveAreaFeature(highlight.id)
            return feature && <GeoJSON key={highlight.id} data={feature} style={getColoredHighlightStyle(highlight.color)} />
          })}
        </Pane>
        <Pane name="choropleth-labels-pane" style={{ zIndex: 404, pointerEvents: 'none' }}>
          <ChoroplethLabels features={labelFeatures} tier={level} language={language} />
        </Pane>
        <FitBoundsOnChange latLngs={fitLatLngs} />
      </MapContainer>
    </div>
  )
}

/**
 * Imperatively re-fits the map whenever the target area changes —
 * MapContainer's own bounds/center/zoom props only apply once, at mount.
 * Also guards against the container not having reached its final laid-out
 * size yet: a flex/grid card can still be resizing itself when this first
 * runs (React's own layout effects fire before the browser's next paint,
 * not after its own reflow settles), which would fit bounds against a
 * stale, too-small container and crop the result. invalidateSize() right
 * before every fit re-reads the container's real current size; the
 * ResizeObserver repeats both whenever that size later changes, not just at
 * mount — covering the card's own layout settling and any later viewport
 * resize alike.
 */
function FitBoundsOnChange({ latLngs }: { latLngs: LatLngTuple[] }) {
  const map = useMap()
  const latLngsRef = useRef(latLngs)

  useEffect(() => {
    latLngsRef.current = latLngs
    map.invalidateSize()
    map.fitBounds(latLngs, { padding: [24, 24] })
  }, [map, latLngs])

  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      map.fitBounds(latLngsRef.current, { padding: [24, 24] })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  return null
}

type ChoroplethLabelFeature = { id: string; name: string; name_th: string; area_sqm: number; coordinates: Position[][][]; anchor: Position }

/** White-halo, non-interactive name label — always dark slate text, unlike the Map page's labelIcon which recolors per basemap (this choropleth only ever sits on a plain white card background). */
function choroplethLabelIcon(text: string, tier: 'district' | 'sub-district') {
  const fontSize = tier === 'district' ? 12 : 10.5
  const halo = [-1, 1].flatMap((dx) => [-1, 1].map((dy) => `${dx}px ${dy}px 1.5px #FFFFFF`)).join(',') + ',0 0 3px #FFFFFF'
  const html = `<span style="display:inline-block;transform:translate(-50%,-50%);white-space:nowrap;font-family:inherit;font-size:${fontSize}px;font-weight:600;color:#1E293B;text-shadow:${halo};">${escapeLabelText(text)}</span>`
  return divIcon({ html, className: '' })
}

/**
 * District/sub-district name labels for the Dashboard choropleth — anchored
 * at each feature's pre-computed interior point (not the bbox center), with
 * the same greedy largest-first collision placement as the Map page's own
 * AreaLabels (shared via labelPlacement.ts). Deliberately skips that
 * component's zoom-threshold gating: this map's small embedded size means it
 * typically fits-to-bounds at a much lower absolute zoom than the full-
 * screen Map page ever reaches for the same real-world extent, so reusing
 * those literal thresholds would hide every label here. The on-screen-
 * footprint filter (MIN_LABEL_FOOTPRINT_PX) is what actually does the
 * filtering work instead.
 */
function ChoroplethLabels({ features, tier, language }: { features: ChoroplethLabelFeature[]; tier: 'district' | 'sub-district'; language: Language }) {
  // Same pattern as the Map page's AreaLabels: the state value itself is
  // never read, just used to force a recompute on zoomend/moveend (the
  // placement below reads the map's current projection directly).
  const [, forceRecompute] = useState(0)
  const map = useMapEvents({
    zoomend: () => forceRecompute((v) => v + 1),
    moveend: () => forceRecompute((v) => v + 1),
  })

  function fitsOnScreen(coordinates: Position[][][]): boolean {
    const bounds = multiPolygonBounds(coordinates)
    const topLeft = map.latLngToContainerPoint([bounds.maxLat, bounds.minLon])
    const bottomRight = map.latLngToContainerPoint([bounds.minLat, bounds.maxLon])
    return Math.abs(bottomRight.x - topLeft.x) >= MIN_LABEL_FOOTPRINT_PX && Math.abs(bottomRight.y - topLeft.y) >= MIN_LABEL_FOOTPRINT_PX
  }

  const fontSize = tier === 'district' ? 12 : 10.5
  const candidates = features.filter((feature) => fitsOnScreen(feature.coordinates)).sort((a, b) => b.area_sqm - a.area_sqm)

  const placedBoxes: LabelBox[] = []
  const markers = []
  for (const feature of candidates) {
    const [lon, lat] = feature.anchor
    const point = map.latLngToContainerPoint([lat, lon])
    const name = localizedName(feature.name, feature.name_th, language)
    const { width, height } = estimateLabelBox(name, fontSize)
    const box: LabelBox = { x: point.x, y: point.y, width, height }
    if (placedBoxes.some((placed) => labelBoxesOverlap(placed, box))) continue
    placedBoxes.push(box)
    markers.push(<Marker key={feature.id} position={[lat, lon]} interactive={false} icon={choroplethLabelIcon(name, tier)} />)
  }

  return <>{markers}</>
}

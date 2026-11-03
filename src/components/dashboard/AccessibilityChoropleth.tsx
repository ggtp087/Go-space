import { useEffect, useMemo } from 'react'
import { GeoJSON, MapContainer, Pane, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
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
} from '../../mock/mapBoundaries'
import { BANGKOK_AREA_ID, getAssessmentResult } from '../../mock/assessmentResults'
import type { Year } from '../../mock/years'

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
}

/** Bangkok isn't a polygon feature like a district/sub-district — this wraps its outline as one so it can share the same GeoJSON rendering path. */
function resolveHighlightFeature(id: string): Feature<Polygon | MultiPolygon, { id: string }> | undefined {
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
 * A small read-only choropleth, shared by the Dashboard and Compare —
 * reuses the Map page's boundary data (mock/mapBoundaries.ts) and style
 * tokens (config/mapStyle.ts) rather than copying them, but is its own
 * component since its fill (by access_pct) and scope (districts, or one
 * district's sub-districts) aren't the main Map page's concern. Every layer
 * is non-interactive: interactive: false on the styles below, pointer-events:
 * none on every pane — the only interaction is zoom.
 */
export function AccessibilityChoropleth({ districtId, subDistrictId, year, className = '', highlights }: AccessibilityChoroplethProps) {
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

  const areaStyle = useMemo(
    () =>
      (feature?: Feature<Geometry, { id: string }>) => {
        if (!feature) return {}
        const stats = getAssessmentResult(feature.properties.id, year)
        return getChoroplethStyle(getAccessibilityColor(stats?.access_pct ?? 0), level)
      },
    [level, year],
  )

  const highlightFeature = !isWholeCity && subDistrictId !== 'all' ? mockSubDistrictBoundaries.features.find((f) => f.properties.id === subDistrictId) : undefined

  const fitLatLngs = useMemo(() => getDistrictFitLatLngs(districtId), [districtId])

  return (
    <div className={`overflow-hidden rounded-lg border border-dashed border-line-2 ${className}`}>
      <MapContainer
        center={[13.7563, 100.5018]}
        zoom={10}
        zoomControl
        scrollWheelZoom={false}
        doubleClickZoom
        dragging
        preferCanvas
        className="h-full w-full bg-white"
      >
        <Pane name="choropleth-areas-pane" style={{ zIndex: 401, pointerEvents: 'none' }}>
          <GeoJSON key={`${level}-${districtId}`} data={areaFeatureCollection} style={areaStyle} />
        </Pane>
        <Pane name="choropleth-highlight-pane" style={{ zIndex: 402, pointerEvents: 'none' }}>
          {highlightFeature && <GeoJSON key={highlightFeature.properties.id} data={highlightFeature} style={getChoroplethSelectionStyle()} />}
        </Pane>
        <Pane name="choropleth-multi-highlight-pane" style={{ zIndex: 403, pointerEvents: 'none' }}>
          {highlights?.map((highlight) => {
            const feature = resolveHighlightFeature(highlight.id)
            return feature && <GeoJSON key={highlight.id} data={feature} style={getColoredHighlightStyle(highlight.color)} />
          })}
        </Pane>
        <FitBoundsOnChange latLngs={fitLatLngs} />
      </MapContainer>
    </div>
  )
}

/** Imperatively re-fits the map whenever the target area changes — MapContainer's own bounds/center/zoom props only apply once, at mount. */
function FitBoundsOnChange({ latLngs }: { latLngs: LatLngTuple[] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(latLngs, { padding: [10, 10] })
  }, [map, latLngs])
  return null
}

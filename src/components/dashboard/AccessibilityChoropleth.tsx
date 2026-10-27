import { useEffect, useMemo } from 'react'
import { GeoJSON, MapContainer, Pane, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { getAccessibilityColor, getChoroplethStyle, getHighlightStyle } from '../../config/mapStyle'
import { bangkokOutlineRing, getDistrictFeature, mockDistrictBoundaries, mockSubDistrictBoundaries } from '../../mock/mapBoundaries'
import { getAssessmentResult } from '../../mock/assessmentResults'
import type { Year } from '../../mock/years'

type AccessibilityChoroplethProps = {
  districtId: string
  subDistrictId: string
  year: Year
  className?: string
}

function ringToLatLngs(ring: Position[]): LatLngTuple[] {
  return ring.map(([lon, lat]) => [lat, lon] as LatLngTuple)
}

function getDistrictFitLatLngs(districtId: string): LatLngTuple[] {
  if (districtId === 'all') return ringToLatLngs(bangkokOutlineRing)
  const feature = getDistrictFeature(districtId)
  if (!feature) return ringToLatLngs(bangkokOutlineRing)
  return feature.geometry.coordinates.flatMap((polygon) => ringToLatLngs(polygon[0]))
}

/**
 * A small read-only choropleth for the Dashboard — reuses the Map page's
 * boundary data (mock/mapBoundaries.ts) and style tokens
 * (config/mapStyle.ts) rather than copying them, but is its own component
 * since its fill (by access_pct) and scope (districts, or one district's
 * sub-districts) are Dashboard-specific. Every layer is non-interactive:
 * interactive: false on the styles below, pointer-events: none on every
 * pane — the only interaction is zoom.
 */
export function AccessibilityChoropleth({ districtId, subDistrictId, year, className = '' }: AccessibilityChoroplethProps) {
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
          {highlightFeature && <GeoJSON key={highlightFeature.properties.id} data={highlightFeature} style={getHighlightStyle()} />}
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

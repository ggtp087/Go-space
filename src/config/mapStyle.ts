import type { CircleMarkerOptions, PathOptions } from 'leaflet'
import type { OpsType } from '../mock/opsPoints'

// Single source of truth for the map's GIS-mode rendering — colors and
// weights only, so these can be tweaked without touching MapPage's
// rendering logic.
export const mapStyle = {
  subDistrict: {
    fillColor: '#D4B33B',
    fillOpacity: 1,
    color: '#222222',
    weight: 1.5,
  },
  district: {
    // Same stroke color as sub-district, kept visually distinct purely by
    // a heavier weight so it reads as the outer boundary.
    fillColor: '#D4B33B',
    fillOpacity: 1,
    color: '#222222',
    weight: 2.5,
  },
  opsPoint: {
    radius: 6,
    color: '#333333',
    weight: 0.5,
    fillOpacity: 1,
    colorsByType: {
      park: '#2D6A4F',
      urban_forest: '#1B4332',
      playground: '#E08A2A',
      plaza: '#4E5A52',
      sports_field: '#2563EB',
    } satisfies Record<OpsType, string>,
  },
}

/**
 * Sub-district boundary style. `filled` is true only in GIS mode — in
 * OSM/Satellite mode boundaries are always outline-only so the basemap
 * tiles stay visible underneath.
 */
export function getSubDistrictStyle(filled: boolean): PathOptions {
  if (!filled) return { color: mapStyle.subDistrict.color, weight: mapStyle.subDistrict.weight, fill: false }
  return { color: mapStyle.subDistrict.color, weight: mapStyle.subDistrict.weight, fillColor: mapStyle.subDistrict.fillColor, fillOpacity: mapStyle.subDistrict.fillOpacity, fill: true }
}

/**
 * District boundary style. `filled` is true only when in GIS mode AND the
 * sub-district layer is off (so the district fill stands in for it);
 * otherwise this is an outline-only layer sitting above the sub-district fill.
 */
export function getDistrictStyle(filled: boolean): PathOptions {
  if (!filled) return { color: mapStyle.district.color, weight: mapStyle.district.weight, fill: false }
  return { color: mapStyle.district.color, weight: mapStyle.district.weight, fillColor: mapStyle.district.fillColor, fillOpacity: mapStyle.district.fillOpacity, fill: true }
}

export function getOpsPointStyle(opsType: OpsType): CircleMarkerOptions {
  return {
    radius: mapStyle.opsPoint.radius,
    color: mapStyle.opsPoint.color,
    weight: mapStyle.opsPoint.weight,
    fillOpacity: mapStyle.opsPoint.fillOpacity,
    fillColor: mapStyle.opsPoint.colorsByType[opsType],
  }
}

import type { CircleMarkerOptions, PathOptions } from 'leaflet'
import type { OpsType } from './opsTypes'

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
    // Chosen to stay distinct from each other and from the GIS gold fill,
    // the green service-area overlay, and the red network line, on GIS,
    // OSM, and Satellite basemaps alike.
    colorsByType: {
      open_space: '#2563EB',
      public_park: '#16A34A',
      park_15min: '#EA580C',
      sports_ground: '#7C3AED',
    } satisfies Record<OpsType, string>,
    // Applied to whichever point is currently selected, on top of its own
    // ops_type fill color.
    selectedRadius: 9,
    selectedColor: '#111111',
    selectedWeight: 2.5,
  },
  serviceArea: {
    fillColor: '#2E7D5B',
    fillOpacity: 0.25,
    // Used for every visible park's service area (the "400 m service areas"
    // layer) when more than just the selected park's own is shown — lighter
    // so the selected park's service area still reads as the "main" one.
    allFillOpacity: 0.15,
    color: '#2E7D5B',
    weight: 1.5,
  },
  network: {
    // Reads clearly over both the golden GIS fills and the green service area.
    color: '#E11D48',
    weight: 3,
  },
  // Selected district/sub-district boundary — drawn regardless of the
  // district/sub-district boundary toggles, so picking an area always shows
  // where it is.
  highlight: {
    color: '#111111',
    weight: 4,
  },
}

// Categorical palette for "which area is this" series (Compare's chips,
// bars, and later lines/outlines) — deliberately outside the green→orange
// hues of accessibilityScale below, so a series color is never mistaken for
// an accessibility class.
export const comparisonPalette = ['#2563EB', '#7C3AED', '#DB2777', '#0891B2']

// The one source for the 5-step accessibility color scale — the Dashboard's
// choropleth/brackets/ranking, mock/areas.ts's accessibilityColor(), and the
// Map's legend (mock/accessibilityLegend.ts) all read from this, so there's
// a single place to retune the breaks when real data arrives.
export type AccessibilityBand = { min: number; max: number; color: string; tick: string; label: string }

export const accessibilityScale: AccessibilityBand[] = [
  { min: 0, max: 29, color: '#D9822B', tick: '0%', label: '0–29%' },
  { min: 30, max: 49, color: '#E4B064', tick: '30', label: '30–49%' },
  { min: 50, max: 64, color: '#D8D3A0', tick: '50', label: '50–64%' },
  { min: 65, max: 79, color: '#7FB88F', tick: '65', label: '65–79%' },
  { min: 80, max: 100, color: '#2A7A54', tick: '80–100%', label: '80–100%' },
]

/**
 * Classifies on the ROUNDED value (not the raw decimal), so a figure that
 * displays as "65%" always gets the 65–79 band's color — never a neighboring
 * band's, which is what raw-value classification could do right at a
 * boundary (e.g. 64.6 displays as "65%" but is still < 65 unrounded).
 */
export function getAccessibilityBand(pct: number): AccessibilityBand {
  const rounded = Math.round(pct)
  return accessibilityScale.find((b) => rounded >= b.min && rounded <= b.max) ?? accessibilityScale[accessibilityScale.length - 1]
}

export function getAccessibilityColor(pct: number): string {
  return getAccessibilityBand(pct).color
}

/**
 * Choropleth fill for a district/sub-district polygon, colored by its own
 * access_pct — reuses the sub-district/district stroke/weight tokens above
 * (so it still reads as the same kind of boundary) with the fill swapped
 * for the accessibility color instead of the GIS gold.
 */
export function getChoroplethStyle(fillColor: string, level: 'district' | 'sub-district'): PathOptions {
  const base = level === 'district' ? mapStyle.district : mapStyle.subDistrict
  return { color: base.color, weight: base.weight, fillColor, fillOpacity: 0.85, fill: true, interactive: false }
}

// "Zoom to service area" fitBounds padding (px per side) — keeps the
// service area out from under the docked analysis card. left/right make
// room for the card horizontally; top/bottom then shift the geometry
// within what's left (e.g. a bigger bottom than top pushes it upward).
// Tune these directly — nothing else needs to change.
export const zoomPadding = {
  // Desktop: card docks top-right, 280px wide.
  wide: { left: 140, right: 304, top: 24, bottom: 120 },
  // Narrow/mobile: card is a full-width bottom sheet, ~360px tall.
  narrow: { left: 24, right: 24, top: 24, bottom: 384 },
}

/**
 * Sub-district boundary style. `filled` is true only in GIS mode — in
 * OSM/Satellite mode boundaries are always outline-only so the basemap
 * tiles stay visible underneath.
 */
export function getSubDistrictStyle(filled: boolean): PathOptions {
  if (!filled) return { color: mapStyle.subDistrict.color, weight: mapStyle.subDistrict.weight, fill: false, interactive: false }
  return {
    color: mapStyle.subDistrict.color,
    weight: mapStyle.subDistrict.weight,
    fillColor: mapStyle.subDistrict.fillColor,
    fillOpacity: mapStyle.subDistrict.fillOpacity,
    fill: true,
    interactive: false,
  }
}

/**
 * The district boundary line itself — always stroke-only. Sits above the
 * service-area/network analysis layers, per the stated bottom-to-top order.
 */
export function getDistrictOutlineStyle(): PathOptions {
  return { color: mapStyle.district.color, weight: mapStyle.district.weight, fill: false, interactive: false }
}

/**
 * Fill-only stand-in for the sub-district layer, used in GIS mode when
 * "District boundaries" is on and "Sub-district boundaries" is off. Drawn as
 * a separate layer from the outline above, in the same low pane as the
 * sub-district fill — an opaque fill at the district-outline layer's higher
 * pane would otherwise sit on top of and hide the service-area/network layers.
 */
export function getDistrictFillOnlyStyle(): PathOptions {
  return { fillColor: mapStyle.district.fillColor, fillOpacity: mapStyle.district.fillOpacity, fill: true, stroke: false, interactive: false }
}

export function getOpsPointStyle(opsType: OpsType, selected = false): CircleMarkerOptions {
  return {
    radius: selected ? mapStyle.opsPoint.selectedRadius : mapStyle.opsPoint.radius,
    color: selected ? mapStyle.opsPoint.selectedColor : mapStyle.opsPoint.color,
    weight: selected ? mapStyle.opsPoint.selectedWeight : mapStyle.opsPoint.weight,
    fillOpacity: mapStyle.opsPoint.fillOpacity,
    fillColor: mapStyle.opsPoint.colorsByType[opsType],
  }
}

export function getOpsTypeColor(opsType: OpsType): string {
  return mapStyle.opsPoint.colorsByType[opsType]
}

export function getServiceAreaStyle(): PathOptions {
  return {
    color: mapStyle.serviceArea.color,
    weight: mapStyle.serviceArea.weight,
    fillColor: mapStyle.serviceArea.fillColor,
    fillOpacity: mapStyle.serviceArea.fillOpacity,
    fill: true,
    interactive: false,
  }
}

export function getNetworkStyle(): PathOptions {
  return { color: mapStyle.network.color, weight: mapStyle.network.weight, interactive: false }
}

/** Lighter twin of getServiceAreaStyle, for the "400 m service areas" layer covering every visible park at once. */
export function getAllServiceAreasStyle(): PathOptions {
  return {
    color: mapStyle.serviceArea.color,
    weight: mapStyle.serviceArea.weight,
    fillColor: mapStyle.serviceArea.fillColor,
    fillOpacity: mapStyle.serviceArea.allFillOpacity,
    fill: true,
    interactive: false,
  }
}

export function getHighlightStyle(): PathOptions {
  return { color: mapStyle.highlight.color, weight: mapStyle.highlight.weight, fill: false, interactive: false }
}

import type { CircleMarkerOptions, PathOptions } from 'leaflet'
import type { OpsType } from './opsTypes'

export type BasemapKey = 'gis' | 'osm' | 'satellite'

// Single source of truth for the map's rendering — colors and weights only,
// so these can be tweaked without touching MapPage's rendering logic.
export const mapStyle = {
  // GIS mode's own look: a plain cream fill with a light neutral dashed
  // sub-district stroke under a heavier solid navy district one. Fixed
  // (not basemap-keyed) since GIS mode never changes.
  subDistrict: {
    fillColor: '#F4EFE3',
    fillOpacity: 1,
    color: '#A8A29E',
    weight: 0.8,
    dashArray: '3 3',
  },
  district: {
    fillColor: '#F4EFE3',
    fillOpacity: 1,
    color: '#1F3A5F',
    weight: 2.5,
  },
  // OSM and Satellite have no flat fill to read a boundary against — each
  // needs its own stroke color/weight tuned for its own imagery, keyed by
  // basemap so MapPage never hand-picks a color inline. GIS isn't listed
  // here; it always uses the plain `subDistrict`/`district` tokens above.
  boundariesByBasemap: {
    osm: {
      district: { color: '#1F3A5F', weight: 2, opacity: 0.9 },
      // Gray, not white — white reads as invisible against OSM's own
      // pale-gray/white road and building tiles.
      subDistrict: { color: '#6B7280', weight: 0.8, dashArray: '3 3', opacity: 1 },
    },
    satellite: {
      // White pops against imagery, but needs a dark halo underneath (see
      // districtHalo below) to stay legible over equally-light pixels
      // (concrete, sand, bright rooftops).
      district: { color: '#FFFFFF', weight: 2, opacity: 1 },
      subDistrict: { color: '#FFFFFF', weight: 0.8, dashArray: '3 3', opacity: 0.7 },
    },
  },
  // Only the satellite district line gets a halo — OSM's navy already reads
  // clearly against road-map tiles, and neither basemap's sub-district line
  // asked for one.
  districtHalo: {
    satellite: { color: '#111827', weight: 4, opacity: 0.5 },
  },
  // CSS `filter` applied to the tile pane only (never the vector layers
  // above it) — toned down enough that our boundaries/points/labels read as
  // the foreground, without losing the basemap's own legibility.
  tileFilter: {
    gis: 'none',
    osm: 'grayscale(0.7) brightness(1.05) contrast(0.9)',
    satellite: 'brightness(0.85)',
  } satisfies Record<BasemapKey, string>,
  // Area-name label text color + halo, keyed by basemap — satellite gets
  // white text with a dark halo (navy-on-white-halo would vanish over dark
  // imagery); GIS and OSM share the navy-on-white-halo pair since both have
  // a light background to read against.
  labelByBasemap: {
    gis: { district: '#1F3A5F', subDistrict: '#44403C', haloColor: '#FFFFFF' },
    osm: { district: '#1F3A5F', subDistrict: '#44403C', haloColor: '#FFFFFF' },
    satellite: { district: '#FFFFFF', subDistrict: '#F3F4F6', haloColor: '#111827' },
  } satisfies Record<BasemapKey, { district: string; subDistrict: string; haloColor: string }>,
  // The small background chip a sidebar/legend boundary swatch sits on,
  // keyed by basemap — without it, a white (Satellite) or light-gray (OSM)
  // swatch line can vanish against the sidebar/legend's own white card.
  swatchChipBackground: {
    gis: '#F4EFE3',
    osm: '#E5E7EB',
    satellite: '#1F2937',
  } satisfies Record<BasemapKey, string>,
  opsPoint: {
    // A dark outline on every point (not just selected ones) — the only
    // way yellow and orange stay readable as discrete dots against the
    // cream GIS fill, OSM tiles, and Satellite imagery alike.
    color: '#1F2937',
    weight: 1,
    fillOpacity: 1,
    // Four clearly different tones — no two similar shades. Checked
    // public_park's green against the service-area fill (#2E7D5B, 15–25%
    // opacity, config.serviceArea below): different enough in hue (that
    // fill leans teal, this is a plain leaf green) plus the shape/opacity
    // difference (an opaque outlined dot vs. a diffuse translucent area)
    // that the two don't read as the same color in practice. Avoids red
    // (the selection color) and navy (the district boundary color).
    colorsByType: {
      public_park: '#2E9E44',
      park_15min: '#E6B800',
      open_space: '#F28E2B',
      sports_ground: '#9333EA',
    } satisfies Record<OpsType, string>,
    // Bubble radius scales with the point's own area_sqm (sqrt, so AREA —
    // not radius — is proportional to the real area), clamped so a handful
    // of outliers can't blow the scale out for everything else. Floor is
    // 5, not a literal 4, so the smallest points still keep a workable
    // click target (Leaflet's canvas circleMarker hit area is its own
    // drawn radius — there's no separate hit-tolerance to pad it with).
    minRadius: 5,
    maxRadius: 18,
    minAreaSqm: 1_000,
    maxAreaSqm: 60_000,
    // Applied to whichever point is currently selected — a thicker, darker
    // ring on top of its own radius/fill, not a size change.
    selectedColor: '#111827',
    selectedWeight: 3,
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
    // Dark gray rather than red — the only other red on the map is the
    // area-selection outline below, and a selected park's network showing
    // at the same time as a selected area must never read as "two reds".
    color: '#374151',
    weight: 3,
  },
  // The Dashboard choropleth's own boundary stroke — deliberately distinct
  // from mapStyle.subDistrict above (that one's faint dashed gray is the Map
  // page's own GIS-mode convention and must stay as-is). A choropleth fill
  // needs a solid, dark line on top of it to read clearly at any zoom, for
  // both the district and sub-district level.
  choroplethBoundary: {
    color: '#334155',
    weight: 1.5,
  },
  // Selected district/sub-district boundary — drawn regardless of the
  // district/sub-district boundary toggles, so picking an area always shows
  // where it is. Red (not navy) so a selection is unmistakable from the
  // map's own ordinary boundary lines; the halo is a thin white line drawn
  // just underneath the red stroke so it reads clearly on the cream GIS
  // fill as well as over OSM/Satellite imagery of any brightness.
  selection: {
    color: '#DC2626',
    weight: 3.5,
    fillColor: '#DC2626',
    fillOpacity: 0.06,
    haloColor: '#FFFFFF',
    haloWeight: 6,
    haloOpacity: 0.8,
  },
}

// Categorical palette for "which area is this" series (Compare's chips,
// bars, legend, trend lines, and choropleth outlines) — up to 5 areas, each
// a clearly distinct hue. No purple (too close to blue at outline weight),
// no orange/yellow (they vanish against accessibilityScale's own green→
// orange fills below), and no red (the map's selection color).
export const comparisonPalette = ['#2563EB', '#DB2777', '#0D9488', '#8C564B', '#334155']

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
 * access_pct — stroked with mapStyle.choroplethBoundary (solid, dark slate)
 * rather than the Map page's own faint dashed subDistrict/district tokens,
 * so the boundary reads clearly on top of the accessibility fill. Never
 * dashed — the same stroke at either level, so there's no `level` param.
 */
export function getChoroplethStyle(
  fillColor: string,
  options?: { interactive?: boolean; fillOpacity?: number; weight?: number; color?: string },
): PathOptions {
  return {
    color: options?.color ?? mapStyle.choroplethBoundary.color,
    weight: options?.weight ?? mapStyle.choroplethBoundary.weight,
    dashArray: undefined,
    fillColor,
    fillOpacity: options?.fillOpacity ?? 0.85,
    fill: true,
    interactive: options?.interactive ?? false,
  }
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
 * Sub-district boundary style, tuned per basemap (see mapStyle.
 * boundariesByBasemap) — GIS fills with its own cream/gray pair; OSM and
 * Satellite are always outline-only so the basemap tiles stay visible
 * underneath, each in whichever color actually reads against that imagery.
 */
export function getSubDistrictStyle(basemap: BasemapKey): PathOptions {
  if (basemap === 'gis') {
    return {
      color: mapStyle.subDistrict.color,
      weight: mapStyle.subDistrict.weight,
      dashArray: mapStyle.subDistrict.dashArray,
      fillColor: mapStyle.subDistrict.fillColor,
      fillOpacity: mapStyle.subDistrict.fillOpacity,
      fill: true,
      interactive: false,
    }
  }
  const tokens = mapStyle.boundariesByBasemap[basemap].subDistrict
  return { color: tokens.color, weight: tokens.weight, dashArray: tokens.dashArray, opacity: tokens.opacity, fill: false, interactive: false }
}

/**
 * The district boundary line itself, tuned per basemap — GIS and OSM read
 * clearly on their own; Satellite's white line gets a halo
 * (getDistrictHaloStyle) drawn just underneath it since bright imagery can
 * otherwise swallow a plain white stroke. Sits above the service-area/
 * network analysis layers, per the stated bottom-to-top order.
 */
export function getDistrictOutlineStyle(basemap: BasemapKey): PathOptions {
  if (basemap === 'gis') {
    return { color: mapStyle.district.color, weight: mapStyle.district.weight, fill: false, interactive: false }
  }
  const tokens = mapStyle.boundariesByBasemap[basemap].district
  return { color: tokens.color, weight: tokens.weight, opacity: tokens.opacity, fill: false, interactive: false }
}

/** The dark halo drawn just underneath the white Satellite district line — null on GIS/OSM, which don't use one. */
export function getDistrictHaloStyle(basemap: BasemapKey): PathOptions | null {
  if (basemap !== 'satellite') return null
  const halo = mapStyle.districtHalo.satellite
  return { color: halo.color, weight: halo.weight, opacity: halo.opacity, fill: false, interactive: false }
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

/** Sqrt-scaled bubble radius from a point's real area_sqm, clamped to the configured min/max — area (not radius) reads as proportional to the real size. */
export function getOpsPointRadius(areaSqm: number): number {
  const { minRadius, maxRadius, minAreaSqm, maxAreaSqm } = mapStyle.opsPoint
  const clamped = Math.min(maxAreaSqm, Math.max(minAreaSqm, areaSqm))
  const t = Math.sqrt((clamped - minAreaSqm) / (maxAreaSqm - minAreaSqm))
  return minRadius + t * (maxRadius - minRadius)
}

export function getOpsPointStyle(opsType: OpsType, areaSqm: number, selected = false): CircleMarkerOptions {
  return {
    radius: getOpsPointRadius(areaSqm),
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

/** The thin white line drawn just underneath getSelectionStyle's red, so the red selection outline stays visible on the cream GIS fill and over OSM/Satellite imagery of any brightness. */
export function getSelectionHaloStyle(): PathOptions {
  return { color: mapStyle.selection.haloColor, weight: mapStyle.selection.haloWeight, opacity: mapStyle.selection.haloOpacity, fill: false, interactive: false }
}

/** The currently-selected district/sub-district on the main Map — red outline plus a very light red fill, so the selected area reads as selected even where its boundary runs off-screen. */
export function getSelectionStyle(): PathOptions {
  return {
    color: mapStyle.selection.color,
    weight: mapStyle.selection.weight,
    fillColor: mapStyle.selection.fillColor,
    fillOpacity: mapStyle.selection.fillOpacity,
    fill: true,
    interactive: false,
  }
}

/** Same red as getSelectionStyle, but outline-only — for the Dashboard choropleth, where the area's own accessibility color must stay the fill. */
export function getChoroplethSelectionStyle(): PathOptions {
  return { color: mapStyle.selection.color, weight: mapStyle.selection.weight, fill: false, interactive: false }
}

/** Stroke-only outline in a given series color — for Compare's multiple highlighted areas on one shared choropleth. Independent of the red selection weight above: Compare's own highlight styling is unchanged. */
export function getColoredHighlightStyle(color: string): PathOptions {
  return { color, weight: 4, fill: false, interactive: false }
}

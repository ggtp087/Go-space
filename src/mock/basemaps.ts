export type BasemapOption = {
  value: string
  label: string
  /** Omitted for the GIS basemap, which renders no tiles at all. */
  tileUrl?: string
  attribution?: string
}

// "GIS" is first/default — a QGIS-style export look (no tiles, plain white
// background, just the mock boundary/point layers). The map's own
// minZoom/maxZoom (set on MapContainer) governs every basemap — no
// per-provider zoom override here, so there's one number to keep in sync.
export const basemapOptions: BasemapOption[] = [
  { value: 'gis', label: 'GIS' },
  {
    value: 'osm',
    label: 'OSM',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    value: 'satellite',
    label: 'Satellite',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
]

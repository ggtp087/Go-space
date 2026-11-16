export type MapLayer = {
  id: string
  label: string
  defaultOn: boolean
  /** Shown in the layer panel. Every layer below is backed by real data. */
  enabled: boolean
}

export const mapLayers: MapLayer[] = [
  { id: 'open-spaces', label: 'Open Public Space', defaultOn: true, enabled: true },
  { id: 'service-areas', label: '400 m service areas', defaultOn: true, enabled: true },
  { id: 'district-boundaries', label: 'District boundaries', defaultOn: true, enabled: true },
  { id: 'subdistrict-boundaries', label: 'Sub-district boundaries', defaultOn: false, enabled: true },
  // Loaded by viewport at zoom >= 14 (spatial.road_networks / population_grids).
  { id: 'street-network', label: 'Road network', defaultOn: false, enabled: true },
  { id: 'population', label: 'Population grid', defaultOn: false, enabled: true },
]

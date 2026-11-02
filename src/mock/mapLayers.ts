export type MapLayer = {
  id: string
  label: string
  defaultOn: boolean
  /**
   * Nothing is drawn for this layer yet (no road_networks/population_grids
   * data) — hidden from the sidebar until real data backs it. The toggle
   * state (layerState in MapPage) still initializes for every layer
   * regardless, so flipping this back to true is the only change needed to
   * re-enable one.
   */
  enabled: boolean
}

export const mapLayers: MapLayer[] = [
  { id: 'open-spaces', label: 'Public green & open spaces', defaultOn: true, enabled: true },
  { id: 'service-areas', label: '400 m service areas', defaultOn: true, enabled: true },
  { id: 'district-boundaries', label: 'District boundaries', defaultOn: true, enabled: true },
  { id: 'subdistrict-boundaries', label: 'Sub-district boundaries', defaultOn: false, enabled: true },
  { id: 'street-network', label: 'Street network', defaultOn: false, enabled: false },
  { id: 'population', label: 'Population', defaultOn: false, enabled: false },
]

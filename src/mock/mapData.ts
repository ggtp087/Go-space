import { mockDistrictBoundaries, mockSubDistrictBoundaries } from './mapBoundaries'
import { mockOpsPoints } from './opsPoints'

/** [west, south, east, north] in EPSG:4326 — matches what a real bbox query would expect. */
export type Bbox = [number, number, number, number]

export type MapData = {
  districts: typeof mockDistrictBoundaries
  subDistricts: typeof mockSubDistrictBoundaries
  opsPoints: typeof mockOpsPoints
}

/**
 * Single entry point for the map's overlay data. Returns the full mock
 * dataset regardless of bbox for now — once a real backend exists, this is
 * the one place that needs to change to an actual bbox-filtered fetch.
 */
export function getMapData(_bbox: Bbox): MapData {
  return {
    districts: mockDistrictBoundaries,
    subDistricts: mockSubDistrictBoundaries,
    opsPoints: mockOpsPoints,
  }
}

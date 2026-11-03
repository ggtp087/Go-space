import type { Position } from 'geojson'

// Shared by assessmentResults.ts (population) and opsPoints.ts (how many mock
// open-space points land in each sub-district) so both tell the same "dense
// urban core, sprawling sparse outskirts" story instead of two unrelated
// mock patterns. Real Bangkok's inner districts (Samphanthawong, Bang Rak,
// Phra Nakhon) run into the tens of thousands of people per km²; its
// sprawling outer districts (Nong Chok, Lat Krabang, Bang Khun Thian) are in
// the low hundreds despite covering far more land area.

/** Roughly the old-town/CBD area (Rattanakosin/Siam) — not Bangkok's bounding-box center, which skews east from how far the city sprawls that way. */
const DENSITY_CENTER: Position = [100.5, 13.75] // [lon, lat]

const METERS_PER_DEG_LAT = 110_574
function metersPerDegreeLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180)
}

/** Straight-line distance from the density center, in km — fine at city scale, consistent with the equirectangular approximation used elsewhere in mock/. */
export function distanceFromCenterKm(point: Position): number {
  const [lon, lat] = point
  const mLon = metersPerDegreeLon((lat + DENSITY_CENTER[1]) / 2)
  const dEastM = (lon - DENSITY_CENTER[0]) * mLon
  const dNorthM = (lat - DENSITY_CENTER[1]) * METERS_PER_DEG_LAT
  return Math.hypot(dEastM, dNorthM) / 1000
}

const PEAK_DENSITY_PER_SQKM = 28_000
const MIN_DENSITY_PER_SQKM = 300
const DECAY_KM = 7

/** An exponential falloff from a dense core to a sparse edge — the one curve both population and OPS-point density are shaped by. */
export function densityWeight(distanceKm: number): number {
  return MIN_DENSITY_PER_SQKM + (PEAK_DENSITY_PER_SQKM - MIN_DENSITY_PER_SQKM) * Math.exp(-distanceKm / DECAY_KM)
}

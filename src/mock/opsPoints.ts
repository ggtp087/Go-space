import type { Feature, FeatureCollection, Point } from 'geojson'
import { opsTypeValues, type OpsType } from '../config/opsTypes'
import { findSubDistrictId, isPointInBangkokOutline, OUTLINE_CENTER } from './mapBoundaries'

// ~300 mock public open-space points scattered inside the Bangkok outline,
// denser toward the center. Fully deterministic (fixed seed, no
// Math.random) so the set is identical on every reload.

export type OpsPointProperties = {
  id: string
  name: string
  ops_type: OpsType
  area_sqm: number
  agency: string
  opened_year: number
  subdistrict_id: string
}

// English-only, used purely to build each mock point's placeholder `name`
// (like "District A"/"Sub-district 12" elsewhere, these names stay English
// regardless of UI language) — display labels for the UI go through i18n.
const POINT_NAME_EN: Record<OpsType, string> = {
  open_space: 'Open Space',
  public_park: 'Public Park',
  park_15min: '15-Minute Park',
  sports_ground: 'Sports Ground',
}

// Rough, plausible size range per type (m²) — just enough spread that the
// popup's area figure doesn't look identical across points of the same type.
const AREA_RANGE_SQM: Record<OpsType, [number, number]> = {
  open_space: [2_000, 60_000],
  public_park: [5_000, 40_000],
  park_15min: [1_000, 8_000],
  sports_ground: [2_000, 15_000],
}

const AGENCIES = [
  'Bangkok Metropolitan Administration',
  'District Public Works Office',
  'Department of Environment',
  'Community Management Office',
] as const

const OPENED_YEAR_MIN = 1985
const OPENED_YEAR_MAX = 2024

const TARGET_POINT_COUNT = 300
// Sampling envelope — comfortably larger than the outline's own max radius in
// any direction, so rejection sampling still reaches every corner of it.
const MAX_RADIUS_LON = 0.32
const MAX_RADIUS_LAT = 0.25
const MAX_CANDIDATES = 50_000

/** Cheap deterministic "random" in [0, 1) — same trick as mock/areas.ts's noise helper, just unsigned. */
function pseudoRandom01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function buildOpsPoints(): FeatureCollection<Point, OpsPointProperties> {
  const features: Feature<Point, OpsPointProperties>[] = []
  const typeCounters: Record<OpsType, number> = { open_space: 0, public_park: 0, park_15min: 0, sports_ground: 0 }

  let candidate = 0
  while (features.length < TARGET_POINT_COUNT && candidate < MAX_CANDIDATES) {
    const uAngle = pseudoRandom01(candidate * 3 + 0.11)
    const uRadius = pseudoRandom01(candidate * 3 + 0.53)
    const uType = pseudoRandom01(candidate * 3 + 0.97)
    candidate += 1

    const angle = uAngle * Math.PI * 2
    // Squaring a uniform fraction concentrates samples near 0 (the center),
    // which is what gives the point cloud its denser-downtown look.
    const radiusFrac = uRadius * uRadius
    const lon = OUTLINE_CENTER[0] + Math.cos(angle) * MAX_RADIUS_LON * radiusFrac
    const lat = OUTLINE_CENTER[1] + Math.sin(angle) * MAX_RADIUS_LAT * radiusFrac
    if (!isPointInBangkokOutline([lon, lat])) continue

    const opsType = opsTypeValues[Math.floor(uType * opsTypeValues.length)]
    typeCounters[opsType] += 1
    const id = `geo-ops-${features.length + 1}`

    // Distinct salts (candidate * 5 + ...) from the angle/radius/type draws
    // above, so these don't correlate with where the point landed.
    const [areaMin, areaMax] = AREA_RANGE_SQM[opsType]
    const areaSqm = Math.round(areaMin + (areaMax - areaMin) * pseudoRandom01(candidate * 5 + 0.19))
    const agency = AGENCIES[Math.floor(pseudoRandom01(candidate * 5 + 0.41) * AGENCIES.length)]
    const openedYear = Math.round(OPENED_YEAR_MIN + (OPENED_YEAR_MAX - OPENED_YEAR_MIN) * pseudoRandom01(candidate * 5 + 0.67))

    features.push({
      type: 'Feature',
      properties: {
        id,
        name: `${POINT_NAME_EN[opsType]} ${typeCounters[opsType]}`,
        ops_type: opsType,
        area_sqm: areaSqm,
        agency,
        opened_year: openedYear,
        subdistrict_id: findSubDistrictId([lon, lat]),
      },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    })
  }

  return { type: 'FeatureCollection', features }
}

export const mockOpsPoints = buildOpsPoints()

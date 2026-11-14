import type { Feature, FeatureCollection, Point, Position } from 'geojson'
import { opsTypeValues, type OpsType } from '../config/opsTypes'
import { densityWeight, distanceFromCenterKm } from './density'
import {
  isPointInBangkokOutline,
  isPointInMultiPolygon,
  mockSubDistrictBoundaries,
  multiPolygonBounds,
  multiPolygonCentroid,
} from './mapBoundaries'

// ~300 mock public open-space points, placed by rejection-sampling directly
// inside each sub-district's own real polygon (so a point's subdistrict_id
// is always the polygon it actually landed in, never a nearby guess) and
// weighted toward sub-districts closer to the city center — the same
// distance-based density model mock/assessmentResults.ts shapes population
// with, so the map's open-space dots and the dashboard's population figures
// tell the same "dense core, sparse edge" story. Fully deterministic (fixed
// seed, no Math.random) so the set is identical on every reload.

export type OpsPointProperties = {
  id: string
  name: string
  ops_type: OpsType
  area_sqm: number
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

const OPENED_YEAR_MIN = 1985
const OPENED_YEAR_MAX = 2024

const TARGET_POINT_COUNT = 300
// Attempts to land a uniformly-sampled point inside a sub-district's own
// polygon (not just its bounding box) before giving up on that draw — a
// generous budget since most admin polygons are reasonably compact, so this
// rarely runs more than a handful of times.
const MAX_SAMPLE_ATTEMPTS = 200
// The denser-downtown weighting would otherwise let one central sub-district
// absorb a wildly disproportionate share of the 300 points — once a
// sub-district hits this cap, further draws for it are rejected (sampling
// continues with the next candidate), which naturally spills the "overflow"
// into the next-ring-out sub-districts.
const MAX_POINTS_PER_SUBDISTRICT = Math.ceil((TARGET_POINT_COUNT / mockSubDistrictBoundaries.features.length) * 3)

/** Cheap deterministic "random" in [0, 1) — same trick as mock/areas.ts's noise helper, just unsigned. */
function pseudoRandom01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// Each sub-district's share of the 300 points is weighted by its local
// density (closer to the city center = denser) times its own area, so a
// large-but-sparse outer sub-district and a small-but-dense inner one are
// weighted the way their real open-space counts plausibly would be.
const subDistrictWeights = mockSubDistrictBoundaries.features.map((feature) => {
  const distanceKm = distanceFromCenterKm(multiPolygonCentroid(feature.geometry.coordinates))
  return densityWeight(distanceKm) * feature.properties.area_sqm
})
const totalWeight = subDistrictWeights.reduce((sum, weight) => sum + weight, 0)
const cumulativeWeightFractions = (() => {
  let running = 0
  return subDistrictWeights.map((weight) => {
    running += weight
    return running / totalWeight
  })
})()

function pickSubDistrictIndex(u: number): number {
  for (let i = 0; i < cumulativeWeightFractions.length; i++) {
    if (u <= cumulativeWeightFractions[i]) return i
  }
  return cumulativeWeightFractions.length - 1
}

/** A point uniformly inside the sub-district's own polygon — rejection-sampled within its bounding box; falls back to its centroid in the rare case a very thin/irregular shape exhausts the attempt budget. */
function sampleWithinSubDistrict(feature: (typeof mockSubDistrictBoundaries.features)[number], seed: number): Position {
  const bounds = multiPolygonBounds(feature.geometry.coordinates)
  for (let attempt = 0; attempt < MAX_SAMPLE_ATTEMPTS; attempt++) {
    const u1 = pseudoRandom01(seed * 97 + attempt * 2 + 0.13)
    const u2 = pseudoRandom01(seed * 97 + attempt * 2 + 0.59)
    const lon = bounds.minLon + (bounds.maxLon - bounds.minLon) * u1
    const lat = bounds.minLat + (bounds.maxLat - bounds.minLat) * u2
    if (isPointInMultiPolygon([lon, lat], feature.geometry.coordinates)) return [lon, lat]
  }
  return multiPolygonCentroid(feature.geometry.coordinates)
}

function buildOpsPoints(): FeatureCollection<Point, OpsPointProperties> {
  const features: Feature<Point, OpsPointProperties>[] = []
  const typeCounters: Record<OpsType, number> = { open_space: 0, public_park: 0, park_15min: 0, sports_ground: 0 }
  const countsBySubDistrict = new Map<string, number>()

  let candidate = 0
  // Generous ceiling so a run of draws rejected by already-capped
  // sub-districts can't stall generation short of the target count.
  const maxOuterCandidates = TARGET_POINT_COUNT * 40
  while (features.length < TARGET_POINT_COUNT && candidate < maxOuterCandidates) {
    const uPick = pseudoRandom01(candidate * 7 + 0.11)
    const uType = pseudoRandom01(candidate * 7 + 0.37)
    candidate += 1

    const feature = mockSubDistrictBoundaries.features[pickSubDistrictIndex(uPick)]
    const subdistrictId = feature.properties.id
    const existingCount = countsBySubDistrict.get(subdistrictId) ?? 0
    if (existingCount >= MAX_POINTS_PER_SUBDISTRICT) continue

    const [lon, lat] = sampleWithinSubDistrict(feature, candidate)
    const opsType = opsTypeValues[Math.floor(uType * opsTypeValues.length)]
    typeCounters[opsType] += 1
    const id = `geo-ops-${features.length + 1}`

    // Distinct salts (candidate * 5 + ...) from the pick/type draws above,
    // so these don't correlate with which sub-district or type was chosen.
    const [areaMin, areaMax] = AREA_RANGE_SQM[opsType]
    const areaSqm = Math.round(areaMin + (areaMax - areaMin) * pseudoRandom01(candidate * 5 + 0.19))
    const openedYear = Math.round(OPENED_YEAR_MIN + (OPENED_YEAR_MAX - OPENED_YEAR_MIN) * pseudoRandom01(candidate * 5 + 0.67))

    countsBySubDistrict.set(subdistrictId, existingCount + 1)
    features.push({
      type: 'Feature',
      properties: {
        id,
        name: `${POINT_NAME_EN[opsType]} ${typeCounters[opsType]}`,
        ops_type: opsType,
        area_sqm: areaSqm,
        opened_year: openedYear,
        subdistrict_id: subdistrictId,
      },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    })
  }

  // Largest bubble first in draw order, so a big park's circle never paints
  // over (and makes unclickable) a small one sitting near its edge.
  features.sort((a, b) => b.properties.area_sqm - a.properties.area_sqm)
  return { type: 'FeatureCollection', features }
}

export const mockOpsPoints = buildOpsPoints()

if (import.meta.env.DEV) validateOpsPoints()

/**
 * Dev-only guard: every generated point must land inside the real Bangkok
 * outline, and inside the actual polygon of the sub-district its
 * subdistrict_id names — both should hold by construction (points are
 * sampled directly inside their assigned sub-district's own polygon), this
 * just confirms it rather than assuming it.
 */
function validateOpsPoints(): void {
  if (mockOpsPoints.features.length < TARGET_POINT_COUNT) {
    console.error(`[opsPoints] only generated ${mockOpsPoints.features.length}/${TARGET_POINT_COUNT} points`)
  }

  let outsideBangkok = 0
  let mismatchedSubDistrict = 0
  for (const feature of mockOpsPoints.features) {
    const point = feature.geometry.coordinates
    if (!isPointInBangkokOutline(point)) outsideBangkok += 1
    const owner = mockSubDistrictBoundaries.features.find((f) => f.properties.id === feature.properties.subdistrict_id)
    if (!owner || !isPointInMultiPolygon(point, owner.geometry.coordinates)) mismatchedSubDistrict += 1
  }
  console.info(`[density-check] ops points: ${mockOpsPoints.features.length} generated, ${outsideBangkok} outside Bangkok, ${mismatchedSubDistrict} subdistrict_id mismatches`)
  if (outsideBangkok > 0) console.error(`[opsPoints] ${outsideBangkok} point(s) fall outside the Bangkok outline`)
  if (mismatchedSubDistrict > 0) console.error(`[opsPoints] ${mismatchedSubDistrict} point(s) don't actually lie inside their assigned sub-district`)
}

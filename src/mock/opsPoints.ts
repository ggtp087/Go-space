import type { Feature, FeatureCollection, Point } from 'geojson'
import { isPointInBangkokOutline, OUTLINE_CENTER } from './mapBoundaries'

// ~300 mock public open-space points scattered inside the Bangkok outline,
// denser toward the center. Fully deterministic (fixed seed, no
// Math.random) so the set is identical on every reload.

export const OPS_TYPES = ['park', 'urban_forest', 'playground', 'plaza', 'sports_field'] as const
export type OpsType = (typeof OPS_TYPES)[number]
export type OpsPointProperties = { id: string; name: string; ops_type: OpsType }

const OPS_TYPE_LABELS: Record<OpsType, string> = {
  park: 'Park',
  urban_forest: 'Urban Forest',
  playground: 'Playground',
  plaza: 'Plaza',
  sports_field: 'Sports Field',
}

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
  const typeCounters: Record<OpsType, number> = { park: 0, urban_forest: 0, playground: 0, plaza: 0, sports_field: 0 }

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

    const opsType = OPS_TYPES[Math.floor(uType * OPS_TYPES.length)]
    typeCounters[opsType] += 1
    const id = `geo-ops-${features.length + 1}`
    features.push({
      type: 'Feature',
      properties: { id, name: `${OPS_TYPE_LABELS[opsType]} ${typeCounters[opsType]}`, ops_type: opsType },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    })
  }

  return { type: 'FeatureCollection', features }
}

export const mockOpsPoints = buildOpsPoints()

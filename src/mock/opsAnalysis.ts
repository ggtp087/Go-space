import type { MultiLineString, MultiPolygon, Position } from 'geojson'
import { mockOpsPoints } from './opsPoints'
import type { Year } from './years'

// Shaped like a join across three analysis tables a real backend would have:
// network_analysis_results (network + its length), service_area_results
// (serviceArea + its area), and overlay_results (populationCovered — the
// one piece that plausibly shifts from year to year here).
export type OpsAnalysis = {
  analysis_id: string
  ops_id: string
  network: MultiLineString
  serviceArea: MultiPolygon
  populationCovered: number
  networkLengthM: number
  serviceAreaSqm: number
}

// Bangkok sits at ~13.75°N, where a degree of longitude is noticeably
// shorter than a degree of latitude. Everything below works in a local
// meter offset from the park first, and only converts to lon/lat here.
const METERS_PER_DEG_LAT = 111_320
const METERS_PER_DEG_LON = METERS_PER_DEG_LAT * Math.cos((13.75 * Math.PI) / 180)

function toLon(eastM: number): number {
  return eastM / METERS_PER_DEG_LON
}
function toLat(northM: number): number {
  return northM / METERS_PER_DEG_LAT
}

/** Deterministic [0, 1) value — same trick used across src/mock. */
function pseudoRandom01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function seedFromOpsId(opsId: string): number {
  const match = /\d+/.exec(opsId)
  return match ? Number(match[0]) : 0
}

type LocalPoint = [number, number] // [eastM, northM] offset from the park

function distance(a: LocalPoint, b: LocalPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Clamp a point's distance from the park to maxRadiusM, keeping its direction. */
function clampRadius(p: LocalPoint, maxRadiusM: number): LocalPoint {
  const d = Math.hypot(p[0], p[1])
  if (d <= maxRadiusM || d === 0) return p
  const scale = maxRadiusM / d
  return [p[0] * scale, p[1] * scale]
}

const MAX_REACH_M = 400
const ARM_COUNT = 5

/** A few branching street-like arms reaching ~400 m out from the park, in local-meter space. */
function buildNetworkLines(seed: number): { lines: LocalPoint[][]; lengthM: number } {
  const lines: LocalPoint[][] = []
  let lengthM = 0

  const baseAngleOffset = pseudoRandom01(seed * 7.1 + 0.05) * Math.PI * 2

  for (let arm = 0; arm < ARM_COUNT; arm++) {
    const armAngle =
      baseAngleOffset + (arm / ARM_COUNT) * Math.PI * 2 + (pseudoRandom01(seed * 11 + arm * 5 + 0.2) - 0.5) * 0.6

    const leg1Length = 140 + 90 * pseudoRandom01(seed * 13 + arm * 5 + 0.3)
    const p0: LocalPoint = [0, 0]
    const p1: LocalPoint = [Math.cos(armAngle) * leg1Length, Math.sin(armAngle) * leg1Length]

    const bendAngle = armAngle + (pseudoRandom01(seed * 17 + arm * 5 + 0.4) - 0.5) * 1.4
    const leg2Length = 140 + 110 * pseudoRandom01(seed * 19 + arm * 5 + 0.5)
    const p2 = clampRadius([p1[0] + Math.cos(bendAngle) * leg2Length, p1[1] + Math.sin(bendAngle) * leg2Length], MAX_REACH_M)

    lines.push([p0, p1, p2])
    lengthM += distance(p0, p1) + distance(p1, p2)

    // The first couple of arms get a short perpendicular spur, so the
    // network reads as branching rather than a plain star.
    if (arm < 2) {
      const spurAngle = armAngle + (pseudoRandom01(seed * 23 + arm * 5 + 0.6) < 0.5 ? 1 : -1) * (Math.PI / 2)
      const spurLength = 70 + 70 * pseudoRandom01(seed * 29 + arm * 5 + 0.7)
      const spurEnd = clampRadius(
        [p1[0] + Math.cos(spurAngle) * spurLength, p1[1] + Math.sin(spurAngle) * spurLength],
        MAX_REACH_M,
      )
      lines.push([p1, spurEnd])
      lengthM += distance(p1, spurEnd)
    }
  }

  return { lines, lengthM }
}

/** An irregular ring (not a circle) around the park, radius maxing out near 400 m. */
function buildServiceAreaRing(seed: number): LocalPoint[] {
  const vertexCount = 22
  const baseRadius = 230 + 50 * pseudoRandom01(seed * 31 + 0.11)
  const wobble1 = 50 + 40 * pseudoRandom01(seed * 37 + 0.22)
  const wobble2 = 15 + 20 * pseudoRandom01(seed * 41 + 0.33)
  const phase1 = pseudoRandom01(seed * 43 + 0.44) * Math.PI * 2
  const phase2 = pseudoRandom01(seed * 47 + 0.55) * Math.PI * 2

  const ring: LocalPoint[] = []
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2
    const radius = Math.min(
      MAX_REACH_M,
      Math.max(120, baseRadius + wobble1 * Math.sin(3 * angle + phase1) + wobble2 * Math.sin(7 * angle + phase2)),
    )
    ring.push([Math.cos(angle) * radius, Math.sin(angle) * radius])
  }
  ring.push(ring[0]) // GeoJSON rings must be closed
  return ring
}

/** Shoelace formula, in local meters — exact since this is a flat offset, not lon/lat. */
function ringAreaSqm(ring: LocalPoint[]): number {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

function toGeoLine(line: LocalPoint[], center: Position): Position[] {
  return line.map(([eastM, northM]) => [center[0] + toLon(eastM), center[1] + toLat(northM)])
}

/**
 * Single entry point for one park's network/service-area analysis — mirrors
 * the shape a real `GET /api/ops/:id/analysis?year=` would return, so this
 * can become a fetch later without changing callers.
 */
export function getOpsAnalysis(opsId: string, year: Year): OpsAnalysis | undefined {
  const point = mockOpsPoints.features.find((feature) => feature.properties.id === opsId)
  if (!point) return undefined

  const center = point.geometry.coordinates
  const seed = seedFromOpsId(opsId)

  const { lines, lengthM } = buildNetworkLines(seed)
  const ring = buildServiceAreaRing(seed)
  const areaSqm = ringAreaSqm(ring)

  // Only the population snapshot moves with the selected year — the network
  // and service-area geometry are treated as a fixed analysis run, the way a
  // real network/service-area recompute would only happen occasionally.
  const densityPerSqm = 0.006 + 0.014 * pseudoRandom01(seed * 53 + 0.66)
  const yearGrowth = 1 + (year - 2017) * 0.012
  const populationCovered = Math.round(areaSqm * densityPerSqm * yearGrowth)

  return {
    analysis_id: `analysis-${opsId}-${year}`,
    ops_id: opsId,
    network: { type: 'MultiLineString', coordinates: lines.map((line) => toGeoLine(line, center)) },
    serviceArea: { type: 'MultiPolygon', coordinates: [[toGeoLine(ring, center)]] },
    populationCovered,
    networkLengthM: Math.round(lengthM),
    serviceAreaSqm: Math.round(areaSqm),
  }
}

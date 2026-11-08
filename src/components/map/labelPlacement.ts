import type { Position } from 'geojson'
import { isPointInMultiPolygon, multiPolygonBounds, multiPolygonCentroid } from '../../mock/mapBoundaries'

// Below this on-screen footprint (px, in either dimension), an area reads as
// a sliver too small to plausibly carry a text label without just adding
// clutter — its label is dropped before collision placement even considers
// it. Shared by the Map page and the Dashboard choropleth, so "does this
// area get a label" never answers differently between the two.
export const MIN_LABEL_FOOTPRINT_PX = 26

export function escapeLabelText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A deliberately rough text-width estimate (no DOM measurement) — good enough for a greedy collision check, not pixel-perfect layout. */
export function estimateLabelBox(text: string, fontSize: number): { width: number; height: number } {
  return { width: text.length * fontSize * 0.62 + 6, height: fontSize * 1.5 }
}

export type LabelBox = { x: number; y: number; width: number; height: number }

export function labelBoxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return Math.abs(a.x - b.x) * 2 < a.width + b.width && Math.abs(a.y - b.y) * 2 < a.height + b.height
}

function pointToSegmentDistanceSq(p: Position, a: Position, b: Position): number {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return (px - cx) ** 2 + (py - cy) ** 2
}

function distanceToRings(point: Position, polygons: Position[][][]): number {
  let minDistSq = Infinity
  for (const rings of polygons) {
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const d = pointToSegmentDistanceSq(point, ring[i], ring[i + 1])
        if (d < minDistSq) minDistSq = d
      }
    }
  }
  return Math.sqrt(minDistSq)
}

/**
 * A guaranteed-inside label anchor for a (possibly concave) admin boundary —
 * approximates the polygon's "pole of inaccessibility" (the interior point
 * farthest from any edge) via a coarse grid search over the bounding box,
 * rather than multiPolygonCentroid's plain vertex average, which a concave
 * shape can place outside its own boundary. Not a real polylabel
 * implementation (no new dependency) but good enough at the simplified
 * boundary complexity these shapes already ship at — this runs once per
 * feature (memoized by the caller), never per animation frame.
 */
export function findPolygonInteriorPoint(polygons: Position[][][]): Position {
  const bounds = multiPolygonBounds(polygons)
  const steps = 20
  let best: Position | null = null
  let bestDist = -Infinity
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lon = bounds.minLon + ((bounds.maxLon - bounds.minLon) * i) / steps
      const lat = bounds.minLat + ((bounds.maxLat - bounds.minLat) * j) / steps
      const point: Position = [lon, lat]
      if (!isPointInMultiPolygon(point, polygons)) continue
      const dist = distanceToRings(point, polygons)
      if (dist > bestDist) {
        bestDist = dist
        best = point
      }
    }
  }
  return best ?? multiPolygonCentroid(polygons)
}

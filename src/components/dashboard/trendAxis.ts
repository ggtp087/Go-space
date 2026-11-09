/** Rounds to a "nice" 1/2/5-times-a-power-of-10 number — the building block every axis helper below uses for tick spacing. */
export function niceNumber(value: number, round: boolean): number {
  if (value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent
  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }
  return niceFraction * 10 ** exponent
}

/**
 * A padded, "nice"-tick axis for a trend LINE — zoomed to the data's own
 * range (not forced to start at 0), so year-to-year movement is actually
 * visible instead of reading as flat against a 0–100 scale. Clamped to
 * [0, 100] since both accessibility and OPS share are percentages.
 *
 * Picks the tick step from the data's own (unpadded) range, then floors/
 * ceils the data extent to that step — not the other way around (pick a
 * "nice" max first, then pad down to a tick boundary), which could floor
 * `min` all the way down to 0 whenever the padded value landed below one
 * tick step above zero, silently cancelling the zoom (e.g. data 4–14 with
 * a tick step of 5 padded down to 1, which floors to 0). Flooring/ceiling
 * the real data extent instead can't collapse that way, and still gives up
 * to one tick step of padding on each side whenever the extent doesn't
 * already land exactly on a tick.
 */
export function computeTrendYAxis(values: (number | null)[], tickCount = 5): { min: number; max: number; ticks: number[] } {
  const finiteValues = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (finiteValues.length === 0) return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] }

  const dataMin = Math.min(...finiteValues)
  const dataMax = Math.max(...finiteValues)
  const dataRange = Math.max(dataMax - dataMin, 1)
  const step = niceNumber(dataRange / (tickCount - 1), true)

  const min = Math.max(0, Math.floor(dataMin / step) * step)
  const max = Math.min(100, Math.ceil(dataMax / step) * step)

  const ticks: number[] = []
  for (let v = min; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100)
  return { min, max, ticks }
}

/**
 * Same "nice"-tick zoom as computeTrendYAxis, for SIGNED values (e.g. a
 * percentage-point change series) — always includes 0 (the "no change"
 * reference line), and isn't clamped to a non-negative 0–100 range the way
 * computeTrendYAxis is, since a change can go negative.
 */
export function computeSignedAxis(values: (number | null)[], tickCount = 5): { min: number; max: number; ticks: number[] } {
  const finiteValues = values.filter((v): v is number => v !== null && Number.isFinite(v))
  const dataMin = Math.min(0, ...finiteValues)
  const dataMax = Math.max(0, ...finiteValues)
  if (finiteValues.length === 0 || dataMin === dataMax) {
    return { min: -1, max: 1, ticks: [-1, -0.5, 0, 0.5, 1] }
  }
  const dataRange = Math.max(dataMax - dataMin, 1)
  const step = niceNumber(dataRange / (tickCount - 1), true)

  const min = Math.floor(dataMin / step) * step
  const max = Math.ceil(dataMax / step) * step

  const ticks: number[] = []
  for (let v = min; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 100) / 100)
  return { min, max, ticks }
}

/**
 * A 0-based "nice" axis for an arbitrary-magnitude count or percentage (e.g.
 * population, or an OPS-share bar axis) — tick step picked first (from the
 * data's own padded range), then the axis max derived as an exact multiple
 * of it, so the ticks can never land unevenly the way dividing a chosen max
 * into quarters could (e.g. a max of 15 splitting into 0/3.75/7.5/11.25/15,
 * which only reads as "nice" before each quarter gets rounded to a whole
 * number — 0/4/8/11/15).
 */
export function computeCountAxis(values: number[], tickCount = 5): { max: number; ticks: number[] } {
  const dataMax = values.length ? Math.max(...values) : 0
  if (dataMax <= 0) return { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] }
  const tickSpacing = niceNumber((dataMax * 1.15) / (tickCount - 1), false)
  const max = tickSpacing * (tickCount - 1)
  const ticks = Array.from({ length: tickCount }, (_, i) => i * tickSpacing)
  return { max, ticks }
}

/**
 * Which x-axis tick indices to label so a yearly axis with, say, 10 points
 * doesn't run its labels into each other in a narrower card (e.g. a
 * two-column grid at 768px). Always includes the first and last point so
 * the data's range stays visible — the last regularly-spaced index is
 * replaced by (not added alongside) the true last index when the two would
 * otherwise land close enough to overlap.
 */
export function pickLabelIndices(pointCount: number, plotWidth: number, minSpacing = 34): number[] {
  if (pointCount <= 0) return []
  if (pointCount === 1) return [0]
  const maxLabels = Math.max(1, Math.floor(plotWidth / minSpacing))
  const step = Math.max(1, Math.ceil(pointCount / maxLabels))
  const last = pointCount - 1
  const indices: number[] = []
  for (let i = 0; i < last; i += step) indices.push(i)
  if (indices.length > 0 && last - indices[indices.length - 1] < step) {
    indices[indices.length - 1] = last
  } else {
    indices.push(last)
  }
  return indices
}

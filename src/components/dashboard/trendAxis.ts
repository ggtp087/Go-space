/**
 * A "nice" axis max and 5 evenly-spaced ticks (0/25/50/75/100% of that max),
 * comfortably above the series' own data, starting at 0 — for bar charts,
 * where the baseline must be 0 or the bars themselves would mislead.
 */
export function computeNiceAxis(values: number[]): { max: number; ticks: number[] } {
  const dataMax = values.length ? Math.max(...values) : 0
  const candidates = [2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100]
  const max = candidates.find((c) => c >= dataMax * 1.15) ?? Math.ceil((dataMax * 1.15) / 10) * 10
  const decimals = max <= 10 ? 1 : 0
  const factor = 10 ** decimals
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction * factor) / factor)
  return { max, ticks }
}

/** Rounds to a "nice" 1/2/5-times-a-power-of-10 number — the building block both axis helpers below use for tick spacing. */
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
 */
export function computeTrendYAxis(values: (number | null)[], tickCount = 5): { min: number; max: number; ticks: number[] } {
  const finiteValues = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (finiteValues.length === 0) return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] }

  const dataMin = Math.min(...finiteValues)
  const dataMax = Math.max(...finiteValues)
  const dataRange = Math.max(dataMax - dataMin, 1)
  const padding = dataRange * 0.3

  const rawMin = Math.max(0, dataMin - padding)
  const rawMax = Math.min(100, dataMax + padding)
  const niceRange = niceNumber(Math.max(rawMax - rawMin, 1), false)
  const tickSpacing = niceNumber(niceRange / (tickCount - 1), true)

  const min = Math.max(0, Math.floor(rawMin / tickSpacing) * tickSpacing)
  const max = Math.min(100, Math.ceil(rawMax / tickSpacing) * tickSpacing)

  const ticks: number[] = []
  for (let v = min; v <= max + tickSpacing * 0.001; v += tickSpacing) ticks.push(Math.round(v * 100) / 100)
  return { min, max, ticks }
}

/**
 * A 0-based "nice" axis for an arbitrary-magnitude count (e.g. population),
 * unlike computeTrendYAxis which is clamped to a 0–100 percentage.
 */
export function computeCountAxis(values: number[], tickCount = 5): { max: number; ticks: number[] } {
  const dataMax = values.length ? Math.max(...values) : 0
  if (dataMax <= 0) return { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] }
  const tickSpacing = niceNumber((dataMax * 1.15) / (tickCount - 1), true)
  const max = tickSpacing * (tickCount - 1)
  const ticks = Array.from({ length: tickCount }, (_, i) => i * tickSpacing)
  return { max, ticks }
}

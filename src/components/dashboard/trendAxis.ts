/**
 * A "nice" axis max and 5 evenly-spaced ticks (0/25/50/75/100% of that max),
 * comfortably above the series' own data — for a metric with no natural
 * fixed ceiling (e.g. OPS share), so the line doesn't read as flat against
 * an 0–100 scale it will never approach.
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

import { accessibilityScale, getAccessibilityBand, getAccessibilityColor } from '../config/mapStyle'

// Helpers over the 5-step accessibility scale (config/mapStyle.ts,
// accessibilityScale) in the shapes the Dashboard and Comparison use.

/** Color for a given accessibility percentage, on the 5-step scale. */
export function accessibilityColor(pct: number): string {
  return getAccessibilityColor(pct)
}

export type AccessibilityBracket = {
  color: string
  label: string
  count: number
  population: number
  ids: string[]
}

/** How many (and which) of the given areas fall into each step of the 5-step scale — classified the same way (on the value rounded to one decimal) as the bar/choropleth colors, via getAccessibilityBand. Carries each band's area ids (for a legend-click highlight) and total population (for a "3 districts · 410,000 people" row). */
export function getAccessibilityBrackets(rows: { id: string; access_pct: number; total_population: number }[]): AccessibilityBracket[] {
  return accessibilityScale
    .slice()
    .reverse()
    .map((band) => {
      const matching = rows.filter((row) => getAccessibilityBand(row.access_pct) === band)
      return {
        color: band.color,
        label: band.label,
        count: matching.length,
        population: matching.reduce((sum, row) => sum + row.total_population, 0),
        ids: matching.map((row) => row.id),
      }
    })
}

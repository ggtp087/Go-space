import type { LegendStep } from '../components/ui/Legend'

/** The 5-step accessibility color scale, low to high. Matches the SDG 11.7.1 map legend. */
export const accessibilityLegendSteps: LegendStep[] = [
  { color: '#D9822B', tick: '0%' },
  { color: '#E4B064', tick: '30' },
  { color: '#D8D3A0', tick: '50' },
  { color: '#7FB88F', tick: '65' },
  { color: '#2A7A54', tick: '80–100%' },
]

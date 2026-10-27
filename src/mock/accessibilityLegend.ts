import type { LegendStep } from '../components/ui/Legend'
import { accessibilityScale } from '../config/mapStyle'

/** The 5-step accessibility color scale, low to high. Matches the SDG 11.7.1 map legend. */
export const accessibilityLegendSteps: LegendStep[] = accessibilityScale.map((band) => ({ color: band.color, tick: band.tick }))

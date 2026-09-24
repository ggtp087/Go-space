// Sample analysis years. Real data collection will likely add more over time.
export const availableYears = [2024, 2026] as const
export type Year = (typeof availableYears)[number]
export const defaultYear: Year = 2026

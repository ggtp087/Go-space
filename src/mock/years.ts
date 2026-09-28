// Sample analysis years. Real data collection will likely add more over time.
export const availableYears = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const
export type Year = (typeof availableYears)[number]
export const defaultYear: Year = 2026

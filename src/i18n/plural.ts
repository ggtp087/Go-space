/** English count-noun agreement: the singular form for exactly ±1, the plural otherwise ("+1 space", "−1 space", "0 spaces", "+2 spaces"). Thai strings pass the same word for both forms, so Thai output is unchanged. */
export function pluralize(count: number, singular: string, plural: string): string {
  return Math.abs(count) === 1 ? singular : plural
}

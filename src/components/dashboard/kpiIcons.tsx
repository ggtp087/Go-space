import type { ReactNode } from 'react'

/** The 5 Dashboard KPI icons — shared with Compare's per-KPI comparison grid, so both pages show literally the same icon for the same metric. */
export const KPI_ICONS: Record<string, ReactNode> = {
  accessibility: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.5" r="2.1" />
      <path d="M12 6.5v5" />
      <path d="M12 11.5l-3.5 7" />
      <path d="M12 11.5l3 7.5" />
      <path d="M12 8l-3.5 2.5" />
      <path d="M12 8l4 1.5" />
    </svg>
  ),
  covered: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.8-6 5.5-6s5.5 2.5 5.5 6" />
      <path d="M16 8.5l2 2 3.5-4" />
    </svg>
  ),
  notCovered: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.8-6 5.5-6s5.5 2.5 5.5 6" />
      <path d="M16.5 6.5l4 4" />
      <path d="M20.5 6.5l-4 4" />
    </svg>
  ),
  spaces: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="4.5" />
      <line x1="9" y1="12.5" x2="9" y2="20" />
      <circle cx="16" cy="11" r="3.2" />
      <line x1="16" y1="14.2" x2="16" y2="20" />
    </svg>
  ),
  opsShare: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
}

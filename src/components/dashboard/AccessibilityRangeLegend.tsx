import { accessibilityScale } from '../../config/mapStyle'

/**
 * Compact key for the accessibility choropleth — the 5 report levels as
 * swatch + range, high to low (the Dashboard legend's order), plus the note
 * on how the 20% intervals were defined. No counts: for maps whose fills
 * (and donut colors) need explaining without the Dashboard's per-class
 * bracket breakdown, e.g. the Comparison page.
 */
export function AccessibilityRangeLegend({ title, note, className = '' }: { title: string; note: string; className?: string }) {
  const bands = [...accessibilityScale].reverse()
  return (
    <div className={className}>
      <p className="mb-1.5 text-[11.5px] font-semibold text-ink">{title}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {bands.map((band) => (
          <span key={band.label} className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-slate">
            <span className="h-[11px] w-[11px] flex-none rounded-[3px]" style={{ background: band.color }} />
            {band.label}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-mist">{note}</p>
    </div>
  )
}

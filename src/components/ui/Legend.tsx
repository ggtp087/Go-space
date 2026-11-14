export type LegendStep = {
  color: string
  tick: string
}

type LegendProps = {
  title: string
  note?: string
  /** Small print under the scale — e.g. how the class breaks were defined. */
  footnote?: string
  steps: LegendStep[]
  className?: string
}

/** The 5-step accessibility color scale shown on map/dashboard views. */
export function Legend({ title, note, footnote, steps, className = '' }: LegendProps) {
  return (
    <div className={`w-[250px] rounded-xl border border-line bg-card p-[14px_16px] shadow-card ${className}`}>
      <p className="mb-[3px] text-xs font-bold text-ink">{title}</p>
      {note && <p className="mb-2.5 text-[11px] text-slate">{note}</p>}
      <div className="flex h-3 overflow-hidden rounded-md">
        {steps.map((step, index) => (
          <span key={index} className="flex-1" style={{ background: step.color }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-mist">
        {steps.map((step, index) => (
          <span key={index}>{step.tick}</span>
        ))}
      </div>
      {footnote && <p className="mt-2 text-[10.5px] leading-snug text-mist">{footnote}</p>}
    </div>
  )
}

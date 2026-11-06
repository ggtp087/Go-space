import type { ReactNode } from 'react'

type KpiCardProps = {
  icon: ReactNode
  heading: string
  value: string
  /** One short line explaining what the number means — kept separate from `heading` so the heading can stay a 2-3 word label. */
  description: string
  tone?: 'green' | 'amber'
  /** Small pill next to the heading, e.g. "SDG 11.7.1" — omitted when not given. */
  tag?: string
  /** Delta-vs-previous-year row, shown below a divider — e.g. a colored arrow + sentence. */
  footer?: ReactNode
}

export function KpiCard({ icon, heading, value, description, tone = 'green', tag, footer }: KpiCardProps) {
  return (
    <div className="rounded-[14px] border border-line bg-card p-[18px]">
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] ${
            tone === 'amber' ? 'bg-accent-100 text-accent-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {icon}
        </div>
        {/* A fixed-height heading (room for 2 lines) plus an always-reserved
            tag row — present or not — so the value/description/divider below
            start at the same y in every card, whether or not this one's
            heading wraps or carries a tag. */}
        <div className="min-w-0 flex-1">
          <h3 className="flex min-h-[40px] items-center text-[16px] font-semibold leading-tight text-ink">{heading}</h3>
          <div className="mt-1 h-[18px]">
            {tag && <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[9.5px] font-bold text-green-700">{tag}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 text-[26px] font-bold leading-[1.1] text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-xs leading-[1.4] text-slate">{description}</div>
      {footer && <div className="mt-2.5 border-t border-line pt-2 text-[11px]">{footer}</div>}
    </div>
  )
}

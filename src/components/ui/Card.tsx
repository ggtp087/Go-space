import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  /** One short line under the title saying what question this card answers. */
  subtitle?: string
  note?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, subtitle, note, actions, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-[14px] border border-line bg-card p-5 ${className}`}>
      {(title || note || actions) && (
        <div className={`flex items-center justify-between ${subtitle ? 'mb-1' : 'mb-4'}`}>
          {title && <h3 className="text-[14.5px] font-bold text-ink">{title}</h3>}
          {actions ?? (note && <span className="text-[11.5px] text-mist">{note}</span>)}
        </div>
      )}
      {subtitle && <p className="mb-4 text-[12px] text-slate">{subtitle}</p>}
      {children}
    </div>
  )
}

import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  note?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, note, actions, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-[14px] border border-line bg-card p-5 ${className}`}>
      {(title || note || actions) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-[14.5px] font-bold text-ink">{title}</h3>}
          {actions ?? (note && <span className="text-[11.5px] text-mist">{note}</span>)}
        </div>
      )}
      {children}
    </div>
  )
}

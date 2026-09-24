import type { ReactNode } from 'react'

type SidePanelProps = {
  title: string
  side?: 'left' | 'right'
  collapsed: boolean
  onToggleCollapse: () => void
  width?: number
  footer?: ReactNode
  children: ReactNode
}

/** The collapsible filter/detail panel flanking the map. */
export function SidePanel({ title, side = 'left', collapsed, onToggleCollapse, width = 296, footer, children }: SidePanelProps) {
  const pointsLeft = side === 'left' ? !collapsed : collapsed

  return (
    <div
      className={`flex flex-none flex-col overflow-hidden bg-card transition-[width] duration-150 ${
        side === 'left' ? 'border-r' : 'border-l'
      } border-line`}
      style={{ width: collapsed ? 52 : width }}
    >
      <div className="flex h-[52px] flex-none items-center justify-between border-b border-line px-[18px]">
        {!collapsed && <span className="truncate text-[13px] font-bold tracking-[.2px] text-ink">{title}</span>}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          className="ml-auto flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md border border-line bg-white text-slate"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {pointsLeft ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto p-[18px]">{children}</div>
          {footer && <div className="flex-none border-t border-line p-[14px_18px]">{footer}</div>}
        </>
      )}
    </div>
  )
}

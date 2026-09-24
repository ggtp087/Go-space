import type { ReactNode } from 'react'

type KpiCardProps = {
  icon: ReactNode
  value: string
  label: string
  tone?: 'green' | 'amber'
}

export function KpiCard({ icon, value, label, tone = 'green' }: KpiCardProps) {
  return (
    <div className="rounded-[14px] border border-line bg-card p-[18px]">
      <div
        className={`mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] ${
          tone === 'amber' ? 'bg-accent-100 text-accent-700' : 'bg-green-100 text-green-700'
        }`}
      >
        {icon}
      </div>
      <div className="text-[26px] font-bold leading-[1.1] text-ink tabular-nums">{value}</div>
      <div className="mt-[5px] text-xs leading-[1.4] text-slate">{label}</div>
    </div>
  )
}

import { KPI_ICONS } from './kpiIcons'
import { computeCountAxis } from './trendAxis'
import { formatPct } from '../../mock/areas'
import { totalOpsCount, type AreaRow } from '../../mock/assessmentResults'
import type { Strings } from '../../i18n/strings'

type CompareItem = { key: string; color: string; row: AreaRow | undefined }

type MetricFormat = 'percent' | 'count'

type CompareKpiConfig = {
  id: 'accessibility' | 'covered' | 'notCovered' | 'spaces' | 'opsShare'
  heading: string
  tone: 'green' | 'amber'
  format: MetricFormat
  getValue: (row: AreaRow) => number
}

const MINI_CHART_HEIGHT = 108

function buildConfigs(t: Strings): CompareKpiConfig[] {
  return [
    { id: 'accessibility', heading: t.dashboard.kpi.accessibilityHeading, tone: 'green', format: 'percent', getValue: (row) => row.access_pct },
    { id: 'covered', heading: t.dashboard.kpi.coveredHeading, tone: 'green', format: 'count', getValue: (row) => Math.round(row.population_with_access) },
    {
      id: 'notCovered',
      heading: t.dashboard.kpi.notCoveredHeading,
      tone: 'amber',
      format: 'count',
      getValue: (row) => Math.round(row.total_population - row.population_with_access),
    },
    { id: 'spaces', heading: t.dashboard.kpi.spacesHeading, tone: 'green', format: 'count', getValue: (row) => totalOpsCount(row.ops_count) },
    { id: 'opsShare', heading: t.dashboard.kpi.opsShareHeading, tone: 'green', format: 'percent', getValue: (row) => row.share_ops_pct },
  ]
}

/**
 * The Comparison page's "Key metrics" grid — one small chart per Dashboard
 * KPI (same order, icons, and headings), one bar per compared area in its
 * series color, labeled with its own value. No gaps between areas — each
 * area's values stand on their own.
 */
export function CompareKpiGrid({ items, t }: { items: CompareItem[]; t: Strings }) {
  const configs = buildConfigs(t)
  const hasPopulationCharts = configs.some((c) => c.id === 'covered' || c.id === 'notCovered')
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {configs.map((config) => (
          <CompareKpiMiniChart key={config.id} config={config} items={items} />
        ))}
      </div>
      {hasPopulationCharts && <p className="mt-3 text-[11px] text-mist">{t.compare.populationNote}</p>}
    </div>
  )
}

function CompareKpiMiniChart({ config, items }: { config: CompareKpiConfig; items: CompareItem[] }) {
  const values = items.map((item) => (item.row ? config.getValue(item.row) : null))
  const numericValues = values.filter((v): v is number => v !== null)
  const axisMax =
    config.format === 'percent'
      ? config.id === 'accessibility'
        ? 100
        : Math.max(1, computeCountAxis(numericValues).max)
      : computeCountAxis(numericValues).max

  return (
    <div className="min-w-0 rounded-[14px] border border-line bg-card p-3">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-[8px] ${
            config.tone === 'amber' ? 'bg-accent-100 text-accent-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {KPI_ICONS[config.id]}
        </div>
        <h4 className="flex min-h-[28px] min-w-0 flex-1 items-center text-[11.5px] font-semibold leading-tight text-ink">{config.heading}</h4>
      </div>
      <div className="mt-3 flex items-end justify-center gap-1.5" style={{ height: MINI_CHART_HEIGHT }}>
        {items.map((item, index) => {
          const value = values[index]
          return (
            <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              {value === null ? (
                <span className="text-[10px] font-bold text-mist">—</span>
              ) : (
                <div
                  className="relative w-full max-w-[22px] rounded-t-[4px]"
                  style={{ height: Math.max(3, (value / axisMax) * (MINI_CHART_HEIGHT - 18)), background: item.color }}
                >
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9.5px] font-bold text-ink tabular-nums">
                    {config.format === 'percent' ? formatPct(value) : value.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

export interface DonutDatum {
  id?: string
  name: string
  value: number
  color: string
}

export function CategoryDonut({
  data,
  total,
  size = 180,
  centerLabel = 'Tổng chi',
  onSelect,
}: {
  data: DonutDatum[]
  total: number
  size?: number
  centerLabel?: string
  onSelect?: (datum: DonutDatum) => void
}) {
  const compact = size < 170

  return (
    <div className="relative mx-auto max-w-full" style={{ height: size, width: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
            onClick={(_, index) => {
              if (onSelect && typeof index === 'number' && data[index]) onSelect(data[index])
            }}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-sm">
                  <div className="font-medium text-popover-foreground">{p.name}</div>
                  <div className="tabular text-muted-foreground">{formatVND(Number(p.value))}</div>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-muted-foreground', compact ? 'text-[0.65rem]' : 'text-xs')}>
          {centerLabel}
        </span>
        <span
          className={cn(
            'tabular max-w-[72%] truncate text-center font-bold tracking-tight',
            compact ? 'text-xs' : 'text-lg',
          )}
          title={formatVND(total)}
        >
          {formatVND(total)}
        </span>
      </div>
    </div>
  )
}

export function BalanceTrendChart({
  data,
  height = 200,
  balanceLabel = 'Số dư',
}: {
  data: { month: string; balance: number }[]
  height?: number
  balanceLabel?: string
}) {
  const balances = data.map((d) => d.balance)
  const min = balances.length ? Math.min(...balances) : 0
  const max = balances.length ? Math.max(...balances) : 0
  // A flat or near-flat series (e.g. all zeros) would otherwise render as a barely-visible
  // sliver against an auto-scaled axis; pad the domain so it's always readable.
  const padding = Math.max((max - min) * 0.15, 1)

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          />
          <YAxis hide domain={[min - padding, max + padding]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-sm">
                  <div className="mb-1 font-medium text-popover-foreground">{label}</div>
                  <div className="flex items-center gap-2 tabular">
                    <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                    <span className="text-muted-foreground">{balanceLabel}:</span>
                    <span className="font-medium text-popover-foreground">
                      {formatVND(Number(payload[0].value))}
                    </span>
                  </div>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#gBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

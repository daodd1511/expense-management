'use client'

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
import { formatVND } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface DonutDatum {
  name: string
  value: number
  color: string
}

export function CategoryDonut({
  data,
  total,
  size = 180,
}: {
  data: DonutDatum[]
  total: number
  size?: number
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
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
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
          Tổng chi
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

export function TrendChart({
  data,
  height = 200,
}: {
  data: { month: string; income: number; expense: number }[]
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-expense)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-expense)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
          />
          <YAxis hide domain={[0, 'dataMax + 5']} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="mb-1 font-medium text-popover-foreground">{label}</div>
                  {payload.map((p) => (
                    <div key={p.dataKey} className="flex items-center gap-2 tabular">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: p.color as string }}
                      />
                      <span className="text-muted-foreground">
                        {p.dataKey === 'income' ? 'Thu' : 'Chi'}:
                      </span>
                      <span className="font-medium text-popover-foreground">
                        {Number(p.value).toFixed(1)}tr
                      </span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="var(--color-income)"
            strokeWidth={2}
            fill="url(#gInc)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--color-expense)"
            strokeWidth={2}
            fill="url(#gExp)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

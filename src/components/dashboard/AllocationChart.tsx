'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '@/lib/store'
import { assetAllocation } from '@/lib/calculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const COLORS = [
  '#1c1c1e',
  '#4b5563',
  '#22c55e',
  '#f59e0b',
  '#6366f1',
  '#f97316',
  '#a855f7',
  '#64748b',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="font-medium text-foreground">{item.name}</p>
        <p className="font-bold text-foreground">{formatCurrency(item.value, currencySymbol)}</p>
        <p className="text-muted-foreground text-xs">{item.payload.pct?.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export function AllocationChart() {
  const { assets, settings } = useStore()
  const sym = settings.currency_symbol

  const data = useMemo(() => assetAllocation(assets), [assets])
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])
  const dataWithPct = useMemo(
    () => data.map((d) => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 })),
    [data, total],
  )

  if (data.length === 0) return null

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">자산 배분</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataWithPct}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dataWithPct.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currencySymbol={sym} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full space-y-2">
            {dataWithPct.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm text-muted-foreground flex-1 truncate">{d.name}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(d.value, sym)}</span>
                <span className="text-xs font-medium text-foreground w-9 text-right">{d.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

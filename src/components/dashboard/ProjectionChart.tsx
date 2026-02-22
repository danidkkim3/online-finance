'use client'

import { useState, useRef, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { AssetProjection } from '@/lib/calculator'

interface ProjectionChartProps {
  data: number[]
  assetBreakdown?: AssetProjection[]
  fireNumber: number
  currencySymbol?: string
  currentAge?: number
}

const ASSET_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
]

function formatYAxis(value: number, symbol = '$'): string {
  if (symbol === '₩') {
    if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}억`
    if (value >= 10_000) return `${Math.round(value / 10_000)}만`
    return String(Math.round(value))
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, currencySymbol, currentAge, assetBreakdown }: any) => {
  if (active && payload && payload.length) {
    const age = currentAge + Math.round(label / 12)
    const years = (label / 12).toFixed(1)
    const monthIndex = label - 1  // label = month (1-based)
    const total = payload[0].value

    const breakdown: { name: string; value: number; pct: number; color: string }[] =
      (assetBreakdown ?? [])
        .map((a: AssetProjection, i: number) => ({
          name: a.name,
          value: a.values[monthIndex] ?? 0,
          pct: total > 0 ? Math.round(((a.values[monthIndex] ?? 0) / total) * 100) : 0,
          color: ASSET_COLORS[i % ASSET_COLORS.length],
        }))
        .filter((a: { value: number }) => a.value > 0)
        .sort((a: { value: number }, b: { value: number }) => b.value - a.value)

    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm shadow-lg min-w-[200px]">
        <p className="text-gray-500 text-xs mb-1.5">{age}세 · +{years}년</p>
        <p className="font-bold text-[#1c1c1e] mb-2">
          {formatCurrency(total, currencySymbol)}
        </p>
        {breakdown.length > 0 && (
          <div className="space-y-1 border-t border-gray-100 pt-2">
            {breakdown.map((a) => (
              <div key={a.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                  <span className="text-xs text-gray-600 truncate">{a.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-medium text-[#1c1c1e]">
                    {formatCurrency(a.value, currencySymbol)}
                  </span>
                  <span className="text-xs text-gray-400 w-8 text-right">{a.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  return null
}

export function ProjectionChart({
  data,
  assetBreakdown,
  fireNumber,
  currencySymbol = '$',
  currentAge = 30,
}: ProjectionChartProps) {
  const allData = data.map((value, index) => ({
    month: index + 1,
    netWorth: Math.round(value),
  }))

  const total = allData.length

  const [view, setView] = useState({ startIndex: 0, endIndex: total - 1 })
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Reset when projection length changes
  useEffect(() => {
    setView({ startIndex: 0, endIndex: total - 1 })
  }, [total])

  const { startIndex, endIndex } = view

  // ── Key fix: pass only the VISIBLE slice to recharts so Y axis auto-fits ──
  const displayData = allData.slice(startIndex, endIndex + 1)

  // X ticks: adaptive density based on visible range
  const visibleYears = (endIndex - startIndex) / 12
  const ageStep = visibleYears <= 4 ? 1 : visibleYears <= 10 ? 2 : visibleYears <= 20 ? 5 : 10
  const xTicks: number[] = []
  const firstTickAge = Math.ceil((currentAge + startIndex / 12) / ageStep) * ageStep
  for (let age = firstTickAge; age <= currentAge + endIndex / 12; age += ageStep) {
    const month = Math.round((age - currentAge) * 12)
    if (month >= 1 && month <= total) xTicks.push(month)
  }

  // Zoom / pan helpers
  const viewRef = useRef(view)
  viewRef.current = view

  function zoom(factor: number) {
    const { startIndex, endIndex } = viewRef.current
    const range = endIndex - startIndex
    const center = Math.round((startIndex + endIndex) / 2)
    const newRange = Math.max(12, Math.min(total - 1, Math.round(range * factor)))
    const half = Math.round(newRange / 2)
    setView({
      startIndex: Math.max(0, center - half),
      endIndex: Math.min(total - 1, center + half),
    })
  }

  function pan(direction: 1 | -1) {
    const { startIndex, endIndex } = viewRef.current
    const range = endIndex - startIndex
    const step = Math.max(1, Math.round(range * 0.2))
    const newStart = Math.max(0, Math.min(total - 1 - range, startIndex + direction * step))
    setView({ startIndex: newStart, endIndex: newStart + range })
  }

  // Non-passive wheel listener: deltaX → pan, deltaY → zoom
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal swipe → pan
        const { startIndex, endIndex } = viewRef.current
        const range = endIndex - startIndex
        const step = Math.max(1, Math.round(range * 0.15))
        const dir = e.deltaX > 0 ? 1 : -1
        const newStart = Math.max(0, Math.min(total - 1 - range, startIndex + dir * step))
        setView({ startIndex: newStart, endIndex: newStart + range })
      } else {
        // Vertical scroll → zoom
        const factor = e.deltaY > 0 ? 1.25 : 0.8
        const { startIndex, endIndex } = viewRef.current
        const range = endIndex - startIndex
        const center = Math.round((startIndex + endIndex) / 2)
        const newRange = Math.max(12, Math.min(total - 1, Math.round(range * factor)))
        const half = Math.round(newRange / 2)
        setView({
          startIndex: Math.max(0, center - half),
          endIndex: Math.min(total - 1, center + half),
        })
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [total])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
        자산을 추가하면 예측이 표시됩니다
      </div>
    )
  }

  const isFullRange = startIndex === 0 && endIndex === total - 1

  // Only show FIRE line if the fireNumber falls within the visible Y range
  const visibleMax = Math.max(...displayData.map((d) => d.netWorth))
  const showFireLine = fireNumber > 0 && fireNumber <= visibleMax * 1.15

  return (
    <div className="space-y-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentAge + Math.round(startIndex / 12)}세
          {' – '}
          {currentAge + Math.round(endIndex / 12)}세
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => pan(-1)} disabled={startIndex === 0}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-default">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => pan(1)} disabled={endIndex === total - 1}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-default">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button onClick={() => zoom(0.6)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors" title="확대">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => zoom(1.6)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors" title="축소">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView({ startIndex: 0, endIndex: total - 1 })}
            disabled={isFullRange}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-default text-muted-foreground hover:text-foreground hover:bg-gray-100" title="초기화">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart — receives only the visible slice; recharts auto-fits Y naturally */}
      <div ref={containerRef} className="cursor-crosshair select-none">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={displayData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onMouseMove={(state) => {
              if (state.isTooltipActive && state.chartX != null && state.chartY != null) {
                setMousePos({ x: state.chartX, y: state.chartY })
              }
            }}
            onMouseLeave={() => setMousePos(null)}
          >
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="month"
              ticks={xTicks}
              tickFormatter={(v) => `${currentAge + Math.round(v / 12)}세`}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, currencySymbol)}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  {...props}
                  currencySymbol={currencySymbol}
                  currentAge={currentAge}
                  assetBreakdown={assetBreakdown}
                />
              )}
              position={mousePos ? { x: mousePos.x + 16, y: mousePos.y - 20 } : undefined}
              wrapperStyle={{ zIndex: 50 }}
            />
            {showFireLine && (
              <ReferenceLine
                y={fireNumber}
                stroke="#22c55e"
                strokeDasharray="6 3"
                label={{
                  value: `FIRE ${formatYAxis(fireNumber, currencySymbol)}`,
                  fill: '#16a34a',
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#netWorthGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

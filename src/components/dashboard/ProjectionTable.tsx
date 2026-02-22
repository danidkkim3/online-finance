'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AssetProjection } from '@/lib/calculator'

const ASSET_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
]

interface ProjectionTableProps {
  projection: number[]   // monthly values, 360 entries
  assetBreakdown?: AssetProjection[]
  fireNumber: number
  currentAge: number
  currencySymbol: string
  monthlyIncome: number
  salaryGrowthRate: number  // annual %, e.g. 3
  salaryCap: number         // 0 = no cap
  retirementAge: number
  retirementWorkHours: number  // 0 = no work, 1-40 weekly hours
  minWageMonthly: number
  inflationRate: number     // annual %, e.g. 2
}

export function ProjectionTable({
  projection,
  assetBreakdown,
  fireNumber,
  currentAge,
  currencySymbol,
  monthlyIncome,
  salaryGrowthRate,
  salaryCap,
  retirementAge,
  retirementWorkHours,
  minWageMonthly,
  inflationRate,
}: ProjectionTableProps) {
  const currentYear = new Date().getFullYear()
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const rows = useMemo(() => {
    const years: { year: number; age: number; netWorth: number; annualSalary: number; fireReached: boolean; isRetired: boolean; monthIndex: number }[] = []
    const growthFactor = 1 + salaryGrowthRate / 100
    const inflationFactor = 1 + inflationRate / 100
    const currentAnnualSalary = monthlyIncome * 12
    for (let y = 0; y < 30; y++) {
      const monthIndex = y * 12 + 11  // end of each year
      const netWorth = projection[monthIndex] ?? 0
      const age = currentAge + y + 1
      const isRetired = age >= retirementAge
      let annualSalary: number
      if (isRetired) {
        annualSalary = minWageMonthly * (retirementWorkHours / 40) * Math.pow(inflationFactor, y + 1) * 12
      } else {
        const rawSalary = currentAnnualSalary * Math.pow(growthFactor, y + 1)
        annualSalary = salaryCap > 0 ? Math.min(rawSalary, salaryCap) : rawSalary
      }
      years.push({
        year: currentYear + y + 1,
        age,
        netWorth,
        annualSalary,
        fireReached: fireNumber > 0 && netWorth >= fireNumber,
        isRetired,
        monthIndex,
      })
    }
    return years
  }, [projection, fireNumber, currentAge, currentYear, monthlyIncome, salaryGrowthRate, salaryCap, retirementAge, retirementWorkHours, minWageMonthly, inflationRate])

  // Find first FIRE year
  const fireRowIndex = rows.findIndex((r) => r.fireReached)

  function getBreakdown(monthIndex: number) {
    if (!assetBreakdown?.length) return []
    const total = rows.find((r) => r.monthIndex === monthIndex)?.netWorth ?? 0
    return assetBreakdown
      .map((a, i) => ({
        name: a.name,
        value: a.values[monthIndex] ?? 0,
        pct: total > 0 ? Math.round(((a.values[monthIndex] ?? 0) / total) * 100) : 0,
        color: ASSET_COLORS[i % ASSET_COLORS.length],
      }))
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">연도별 순자산 예측</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-2.5 font-medium">연도</th>
                <th className="text-left px-5 py-2.5 font-medium">나이</th>
                <th className="text-right px-5 py-2.5 font-medium">예상 연봉</th>
                <th className="text-right px-5 py-2.5 font-medium">예상 순자산</th>
                <th className="text-right px-5 py-2.5 font-medium">FIRE 달성</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => {
                const isFireYear = i === fireRowIndex
                const isRetirementYear = i > 0 && row.isRetired && !rows[i - 1].isRetired
                const isHovered = hoveredRow === i
                const breakdown = isHovered ? getBreakdown(row.monthIndex) : []

                return (
                  <tr
                    key={row.year}
                    className={isFireYear ? 'bg-green-50' : isRetirementYear ? 'bg-blue-50/50' : 'hover:bg-muted/40 transition-colors'}
                  >
                    <td className={`px-5 py-2.5 tabular-nums font-medium ${isFireYear ? 'text-green-700' : 'text-foreground'}`}>
                      {row.year}
                      {isRetirementYear && (
                        <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">은퇴</span>
                      )}
                    </td>
                    <td className={`px-5 py-2.5 tabular-nums ${isFireYear ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {row.age}세
                    </td>
                    <td className={`px-5 py-2.5 tabular-nums text-right ${isFireYear ? 'text-green-700' : row.isRetired ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {row.isRetired
                        ? (retirementWorkHours ?? 0) === 0
                          ? '—'
                          : formatCurrency(Math.round(row.annualSalary), currencySymbol)
                        : monthlyIncome > 0
                        ? formatCurrency(Math.round(row.annualSalary), currencySymbol)
                        : '—'}
                    </td>
                    <td
                      className={`px-5 py-2.5 tabular-nums text-right font-medium relative ${isFireYear ? 'text-green-700' : 'text-foreground'}`}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {formatCurrency(row.netWorth, currencySymbol)}

                      {/* Asset breakdown popover */}
                      {isHovered && breakdown.length > 0 && (
                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 min-w-[220px] text-left pointer-events-none">
                          <p className="text-xs text-gray-500 mb-2 font-medium">자산 구성 ({row.year})</p>
                          <div className="space-y-1.5">
                            {breakdown.map((a) => (
                              <div key={a.name} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                                  <span className="text-xs text-gray-600 truncate">{a.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-medium text-gray-900">
                                    {formatCurrency(a.value, currencySymbol)}
                                  </span>
                                  <span className="text-xs text-gray-400 w-8 text-right">{a.pct}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {isFireYear ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2.5 py-0.5">
                          🎉 FIRE
                        </span>
                      ) : row.fireReached ? (
                        <span className="text-xs text-green-600 font-medium">달성</span>
                      ) : fireNumber > 0 ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.min(99, Math.round((row.netWorth / fireNumber) * 100))}%
                        </span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

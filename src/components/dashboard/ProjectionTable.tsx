'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface ProjectionTableProps {
  projection: number[]   // monthly values, 360 entries
  fireNumber: number
  currentAge: number
  currencySymbol: string
  monthlyIncome: number
  salaryGrowthRate: number  // annual %, e.g. 3
}

export function ProjectionTable({
  projection,
  fireNumber,
  currentAge,
  currencySymbol,
  monthlyIncome,
  salaryGrowthRate,
}: ProjectionTableProps) {
  const currentYear = new Date().getFullYear()

  const rows = useMemo(() => {
    const years: { year: number; age: number; netWorth: number; annualSalary: number; fireReached: boolean }[] = []
    const growthFactor = 1 + salaryGrowthRate / 100
    for (let y = 0; y < 30; y++) {
      const monthIndex = y * 12 + 11  // end of each year
      const netWorth = projection[monthIndex] ?? 0
      const annualSalary = monthlyIncome * 12 * Math.pow(growthFactor, y + 1)
      years.push({
        year: currentYear + y + 1,
        age: currentAge + y + 1,
        netWorth,
        annualSalary,
        fireReached: fireNumber > 0 && netWorth >= fireNumber,
      })
    }
    return years
  }, [projection, fireNumber, currentAge, currentYear, monthlyIncome, salaryGrowthRate])

  // Find first FIRE year
  const fireRowIndex = rows.findIndex((r) => r.fireReached)

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
                return (
                  <tr
                    key={row.year}
                    className={isFireYear ? 'bg-green-50' : 'hover:bg-muted/40 transition-colors'}
                  >
                    <td className={`px-5 py-2.5 tabular-nums font-medium ${isFireYear ? 'text-green-700' : 'text-foreground'}`}>
                      {row.year}
                    </td>
                    <td className={`px-5 py-2.5 tabular-nums ${isFireYear ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {row.age}세
                    </td>
                    <td className={`px-5 py-2.5 tabular-nums text-right ${isFireYear ? 'text-green-700' : 'text-muted-foreground'}`}>
                      {monthlyIncome > 0 ? formatCurrency(Math.round(row.annualSalary), currencySymbol) : '—'}
                    </td>
                    <td className={`px-5 py-2.5 tabular-nums text-right font-medium ${isFireYear ? 'text-green-700' : 'text-foreground'}`}>
                      {formatCurrency(row.netWorth, currencySymbol)}
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

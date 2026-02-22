'use client'

import { useMemo } from 'react'
import { calculateMilestones } from '@/lib/calculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MilestonesPanelProps {
  projection: number[]
  fireNumber: number
  currentAge: number
  currencySymbol?: string
}

function formatThreshold(value: number, symbol: string): string {
  if (symbol === '₩') {
    if (value >= 100_000_000) {
      return symbol + (value / 100_000_000).toFixed(2) + '억'
    }
    if (value >= 10_000) return symbol + Math.round(value / 10_000) + '만'
    return symbol + value.toLocaleString('ko-KR')
  }
  if (value >= 1_000_000) return symbol + (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (value >= 1_000) return symbol + (value / 1_000).toFixed(0) + 'k'
  return symbol + value
}

export function MilestonesPanel({
  projection,
  fireNumber,
  currentAge,
  currencySymbol = '$',
}: MilestonesPanelProps) {
  const milestones = useMemo(
    () => calculateMilestones(projection, fireNumber, currentAge),
    [projection, fireNumber, currentAge],
  )

  const currentNetWorth = projection[0] ?? 0

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">이정표</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {milestones.map((m) => {
            const reached = currentNetWorth >= m.threshold
            const isFireGoal = m.isFire

            return (
              <div
                key={m.threshold}
                className={cn(
                  'flex items-center justify-between px-5 py-3',
                  isFireGoal && 'bg-green-50',
                )}
              >
                <div className="flex items-center gap-3">
                  {isFireGoal ? (
                    <Target className="w-4 h-4 text-green-600 shrink-0" />
                  ) : reached ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isFireGoal ? 'text-green-700' : reached ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {isFireGoal ? 'FIRE: ' : ''}{formatThreshold(m.threshold, currencySymbol)}
                  </span>
                </div>
                <div className="text-right">
                  {reached ? (
                    <span className="text-xs font-medium text-green-600">달성</span>
                  ) : m.age !== null ? (
                    <div>
                      <span className={cn('text-xs font-medium', isFireGoal ? 'text-green-700' : 'text-foreground')}>
                        {m.age}세
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5">
                        +{m.yearsFromNow}년
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">30년 이후</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

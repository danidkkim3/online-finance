'use client'

import { Debt } from '@/types'
import { useStore } from '@/lib/store'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calcMonthsElapsed } from '@/lib/calculator'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2 } from 'lucide-react'

const repaymentTypeLabels: Record<string, string> = {
  equal_payment: '원리금균등',
  equal_principal: '원금균등',
  graduated: '체증식',
}

const debtClassColors: Record<string, string> = {
  Mortgage: 'bg-blue-50 text-blue-700 border-blue-200',
  'Student Loan': 'bg-purple-50 text-purple-700 border-purple-200',
  'Auto Loan': 'bg-orange-50 text-orange-700 border-orange-200',
  'Credit Card': 'bg-red-50 text-red-700 border-red-200',
  'Personal Loan': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Other: 'bg-gray-50 text-gray-600 border-gray-200',
}

const debtClassLabels: Record<string, string> = {
  Mortgage: '주택담보대출',
  'Student Loan': '학자금대출',
  'Auto Loan': '자동차대출',
  'Credit Card': '신용카드',
  'Personal Loan': '개인대출',
  Other: '기타',
}

interface DebtCardProps {
  debt: Debt
  onEdit: (debt: Debt) => void
}

export function DebtCard({ debt, onEdit }: DebtCardProps) {
  const { deleteDebt, settings } = useStore()
  const sym = settings.currency_symbol

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-foreground truncate">{debt.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${debtClassColors[debt.debt_class] ?? debtClassColors.Other}`}
              >
                {debtClassLabels[debt.debt_class] ?? debt.debt_class}
              </Badge>
            </div>
            {debt.notes && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{debt.notes}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(debt)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:text-destructive"
              onClick={() => deleteDebt(debt.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">
              현재 잔액
              {debt.original_loan_amount && debt.original_loan_amount > debt.balance && (
                <span className="ml-1 text-[10px]">/ {formatCurrency(debt.original_loan_amount, sym)}</span>
              )}
            </p>
            <p className="font-semibold text-red-500">{formatCurrency(debt.balance, sym)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">이율</p>
            <p className="font-medium">{formatPct(debt.annual_interest_rate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">월 납입금</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium">{formatCurrency(debt.monthly_payment, sym)}</p>
              {settings.monthly_income > 0 && debt.monthly_payment > 0 && (
                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                  소득의 {((debt.monthly_payment / settings.monthly_income) * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        {debt.debt_class === 'Mortgage' && debt.repayment_type && (() => {
          const elapsed = debt.loan_start_date ? calcMonthsElapsed(debt.loan_start_date) : null
          const grace = debt.grace_period_months ?? 0
          const term = debt.loan_term_months
          const isInGrace = elapsed !== null && elapsed < grace
          const remaining = term && elapsed !== null ? Math.max(0, term - elapsed) : null

          return (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  {repaymentTypeLabels[debt.repayment_type]}
                </Badge>
                {term && (
                  <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 border-gray-200">
                    {term >= 12 ? `${Math.round(term / 12)}년` : `${term}개월`}
                  </Badge>
                )}
                {grace > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                    거치 {grace}개월
                  </Badge>
                )}
                {debt.manual_payment && (
                  <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">
                    직접 입력
                  </Badge>
                )}
              </div>

              {elapsed !== null && (
                <p className={`text-xs px-2 py-1 rounded-md ${
                  isInGrace
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-blue-50 text-blue-700'
                }`}>
                  {isInGrace
                    ? `거치기간 중 · 잔여 ${grace - elapsed}개월`
                    : `원금 상환 중 · ${elapsed - grace}개월째`}
                  {remaining !== null && ` · 총 잔여 ${remaining}개월`}
                </p>
              )}
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

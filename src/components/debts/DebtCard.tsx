'use client'

import { useState, useMemo } from 'react'
import { Debt } from '@/types'
import { useStore } from '@/lib/store'
import { formatCurrency, formatPct } from '@/lib/utils'
import { calcMonthsElapsed } from '@/lib/calculator'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Building2, ChevronDown, ChevronUp } from 'lucide-react'

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

interface AmortRow {
  year: number
  propertyValue: number | null
  startBalance: number
  annualInterest: number
  annualPrincipal: number
  endBalance: number
  equity: number | null
  ltv: number | null
}

/** Build year-by-year amortization schedule from current state */
function buildAmortization(debt: Debt, propertyValue: number | null, propertyRoi: number): AmortRow[] {
  if (!debt.loan_term_months || debt.balance <= 0) return []

  const elapsed = debt.loan_start_date ? calcMonthsElapsed(debt.loan_start_date) : 0
  const grace = debt.grace_period_months ?? 0
  const remainingTerm = Math.max(1, debt.loan_term_months - elapsed)
  const remainingGrace = Math.max(0, grace - elapsed)
  const repaymentTerm = Math.max(1, remainingTerm - remainingGrace)
  const r = debt.annual_interest_rate / 100 / 12

  // Pre-compute the monthly payment for the repayment phase.
  // Grace period is interest-only so the balance entering repayment = debt.balance.
  //
  // Strategy: always compute the standard annuity formula when possible so that
  // we're not dependent on debt.repayment_type being stored with a specific string value.
  // Only skip the formula for equal_principal (handled separately) or manual override.
  const annuityPayment = r === 0
    ? debt.balance / repaymentTerm
    : (debt.balance * r * Math.pow(1 + r, repaymentTerm)) / (Math.pow(1 + r, repaymentTerm) - 1)

  const isEqualPrincipal = debt.repayment_type === 'equal_principal' && !debt.manual_payment
  // Fixed principal chunk per month for equal_principal
  const fixedPrincipalChunk = isEqualPrincipal ? debt.balance / repaymentTerm : 0

  let repaymentPayment: number
  if (debt.manual_payment) {
    repaymentPayment = debt.monthly_payment
  } else if (isEqualPrincipal) {
    repaymentPayment = 0 // not used — handled via fixedPrincipalChunk
  } else {
    // equal_payment, graduated, or unknown — use annuity formula
    repaymentPayment = annuityPayment
  }

  const rows: AmortRow[] = []
  let balance = debt.balance
  const totalYears = Math.ceil(remainingTerm / 12)

  for (let yr = 1; yr <= totalYears; yr++) {
    const startBalance = balance
    let annualInterest = 0
    let annualPrincipal = 0
    const monthsThisYear = Math.min(12, remainingTerm - (yr - 1) * 12)

    for (let mo = 0; mo < monthsThisYear; mo++) {
      if (balance <= 0) break
      // globalIdx: 0-based month index within the remaining schedule
      const globalIdx = (yr - 1) * 12 + mo
      const inGrace = globalIdx < remainingGrace
      const interestCharge = balance * r

      let principalPaid = 0
      if (!inGrace) {
        if (fixedPrincipalChunk > 0) {
          // equal_principal: fixed principal regardless of interest
          principalPaid = Math.min(balance, fixedPrincipalChunk)
        } else {
          principalPaid = Math.max(0, Math.min(balance, repaymentPayment - interestCharge))
        }
      }

      annualInterest += interestCharge
      annualPrincipal += principalPaid
      balance = Math.max(0, balance - principalPaid)
    }

    const propVal = propertyValue !== null
      ? propertyValue * Math.pow(1 + propertyRoi / 100, yr)
      : null

    rows.push({
      year: yr,
      propertyValue: propVal,
      startBalance,
      annualInterest,
      annualPrincipal,
      endBalance: balance,
      equity: propVal !== null ? propVal - balance : null,
      ltv: propVal !== null && propVal > 0 ? (balance / propVal) * 100 : null,
    })

    if (balance <= 0) break
  }

  return rows
}

interface DebtCardProps {
  debt: Debt
  onEdit: (debt: Debt) => void
}

export function DebtCard({ debt, onEdit }: DebtCardProps) {
  const { deleteDebt, settings, assets } = useStore()
  const sym = settings.currency_symbol
  const [showAmort, setShowAmort] = useState(false)

  const linkedAsset = debt.linked_asset_id
    ? assets.find((a) => a.id === debt.linked_asset_id)
    : undefined

  const equity = linkedAsset ? linkedAsset.current_value - debt.balance : null
  const ltv = linkedAsset && linkedAsset.current_value > 0
    ? (debt.balance / linkedAsset.current_value) * 100
    : null

  const amortRows = useMemo(() => {
    if (!showAmort || debt.debt_class !== 'Mortgage') return []
    return buildAmortization(
      debt,
      linkedAsset?.current_value ?? null,
      linkedAsset?.annual_roi_pct ?? 0,
    )
  }, [showAmort, debt, linkedAsset])

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

        {/* Linked real estate asset — equity & LTV */}
        {linkedAsset && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {linkedAsset.name}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-amber-700/60 text-xs">부동산 가치</p>
                <p className="font-medium text-amber-900">{formatCurrency(linkedAsset.current_value, sym)}</p>
              </div>
              <div>
                <p className="text-amber-700/60 text-xs">순 자산 (지분)</p>
                <p className={`font-semibold ${equity !== null && equity >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {equity !== null ? formatCurrency(equity, sym) : '-'}
                </p>
              </div>
              <div>
                <p className="text-amber-700/60 text-xs">LTV</p>
                <p className={`font-medium ${ltv !== null && ltv > 70 ? 'text-red-600' : 'text-amber-900'}`}>
                  {ltv !== null ? `${ltv.toFixed(1)}%` : '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mortgage badges + status */}
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

        {/* Amortization toggle */}
        {debt.debt_class === 'Mortgage' && debt.balance > 0 && debt.loan_term_months && (
          <button
            onClick={() => setShowAmort((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAmort ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAmort ? '상환 일정 닫기' : '연도별 상환 일정 보기'}
          </button>
        )}

        {/* Amortization table */}
        {showAmort && amortRows.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-1.5 pr-3 font-medium">연차</th>
                  {linkedAsset && <th className="text-right py-1.5 pr-3 font-medium">부동산 가치</th>}
                  <th className="text-right py-1.5 pr-3 font-medium">연간 이자</th>
                  <th className="text-right py-1.5 pr-3 font-medium">연간 원금</th>
                  <th className="text-right py-1.5 pr-3 font-medium">잔액</th>
                  {linkedAsset && <th className="text-right py-1.5 font-medium">지분 (Equity)</th>}
                </tr>
              </thead>
              <tbody>
                {amortRows.map((row) => (
                  <tr key={row.year} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-1.5 pr-3 text-muted-foreground">{row.year}년차</td>
                    {linkedAsset && (
                      <td className="py-1.5 pr-3 text-right text-amber-700">
                        {row.propertyValue !== null ? formatCurrency(Math.round(row.propertyValue), sym) : '-'}
                      </td>
                    )}
                    <td className="py-1.5 pr-3 text-right text-red-500">
                      {formatCurrency(Math.round(row.annualInterest), sym)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-blue-600">
                      {formatCurrency(Math.round(row.annualPrincipal), sym)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-medium">
                      {formatCurrency(Math.round(row.endBalance), sym)}
                    </td>
                    {linkedAsset && (
                      <td className={`py-1.5 text-right font-medium ${row.equity !== null && row.equity >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {row.equity !== null ? formatCurrency(Math.round(row.equity), sym) : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

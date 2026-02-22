'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { DebtCard } from './DebtCard'
import { DebtForm } from './DebtForm'
import { Debt } from '@/types'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function DebtsView() {
  const { assets, debts, settings } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | undefined>(undefined)

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const sym = settings.currency_symbol

  const totalContributions = assets.reduce((sum, a) => sum + a.monthly_contribution, 0)
  const totalDebtPayments = debts.reduce((sum, d) => sum + d.monthly_payment, 0)
  const unallocated = settings.monthly_income - settings.monthly_spend - totalContributions - totalDebtPayments

  function handleEdit(debt: Debt) {
    setEditDebt(debt)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditDebt(undefined)
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">부채</h1>
          <p className="text-muted-foreground text-sm mt-1">
            총 부채:{' '}
            <span className="text-red-500 font-semibold">{formatCurrency(totalDebt, sym)}</span>
          </p>
          <p className="text-muted-foreground text-sm mt-0.5">
            월 소득{' '}
            <span className="font-semibold text-foreground">{formatCurrency(settings.monthly_income, sym)}</span>
            {' '}−{' '}월 지출{' '}
            <span className="font-semibold text-foreground">{formatCurrency(settings.monthly_spend, sym)}</span>
            {' '}−{' '}자산 납입{' '}
            <span className="font-semibold text-foreground">{formatCurrency(totalContributions, sym)}</span>
            {' '}−{' '}부채 상환{' '}
            <span className="font-semibold text-foreground">{formatCurrency(totalDebtPayments, sym)}</span>
            {' '}={' '}
            <span className={`font-semibold ${unallocated >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(unallocated, sym)} 미배분
            </span>
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          부채 추가
        </Button>
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-medium">부채가 없습니다</p>
          <p className="text-sm mt-1">훌륭합니다 — 또는 부채를 추가하여 관리하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <DebtForm open={formOpen} onClose={handleClose} editDebt={editDebt} />
    </div>
  )
}

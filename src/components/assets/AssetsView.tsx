'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AssetCard } from './AssetCard'
import { AssetForm, FormValues } from './AssetForm'
import { Asset } from '@/types'
import { Button } from '@/components/ui/button'
import { Plus, Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { totalAssets as calcTotalAssets } from '@/lib/calculator'

const CASH_KEY = '__cash__'

function addCommas(str: string): string {
  const [int, dec] = str.split('.')
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${formatted}.${dec}` : formatted
}

function stripCommas(str: string): string {
  return str.replace(/,/g, '')
}

function parseInput(str: string): number {
  return parseFloat(stripCommas(str)) || 0
}

export function AssetsView() {
  const { assets, debts, settings, updateAsset } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | undefined>(undefined)
  const [prefillValues, setPrefillValues] = useState<Partial<FormValues> | undefined>(undefined)
  // allocation inputs: keyed by asset.id or CASH_KEY, value in display units (raw number)
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({})

  const total = calcTotalAssets(assets)
  const sym = settings.currency_symbol

  const totalContributions = assets.reduce((sum, a) => sum + a.monthly_contribution, 0)
  const totalDebtPayments = debts.reduce((sum, d) => sum + d.monthly_payment, 0)
  const unallocated = settings.monthly_income - settings.monthly_spend - totalContributions - totalDebtPayments

  const totalAllocating = useMemo(() =>
    Object.values(allocationInputs).reduce((sum, v) => sum + parseInput(v), 0),
    [allocationInputs],
  )
  const remaining = unallocated - totalAllocating

  function handleEdit(asset: Asset) {
    setEditAsset(asset)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditAsset(undefined)
    setPrefillValues(undefined)
  }

  function handleInputChange(key: string, raw: string) {
    const stripped = stripCommas(raw)
    if (stripped === '' || /^\d*\.?\d*$/.test(stripped)) {
      setAllocationInputs((prev) => ({ ...prev, [key]: stripped === '' ? '' : addCommas(stripped) }))
    }
  }

  function handleAllocateRest(key: string) {
    if (remaining <= 0) return
    setAllocationInputs((prev) => {
      const current = parseInput(prev[key] ?? '')
      return { ...prev, [key]: addCommas(String(Math.round(current + remaining))) }
    })
  }

  function handleApply() {
    for (const asset of assets) {
      const amount = parseInput(allocationInputs[asset.id] ?? '0')
      if (amount > 0) {
        updateAsset(asset.id, { monthly_contribution: asset.monthly_contribution + amount })
      }
    }
    const cashAmount = parseInput(allocationInputs[CASH_KEY] ?? '0')
    if (cashAmount > 0) {
      setPrefillValues({ asset_class: 'Cash', monthly_contribution: cashAmount })
      setEditAsset(undefined)
      setFormOpen(true)
    }
    setAllocationInputs({})
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">자산</h1>
          <p className="text-muted-foreground text-sm mt-1">
            세후 총 자산:{' '}
            <span className="text-primary font-semibold">{formatCurrency(total, sym)}</span>
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
          자산 추가
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">📈</p>
          <p className="font-medium">자산이 없습니다</p>
          <p className="text-sm mt-1">첫 자산을 추가하여 추적을 시작하세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Unallocated funds CTA */}
      {unallocated > 0 && settings.monthly_income > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  {formatCurrency(unallocated, sym)}/월 미배분
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  각 자산에 배분할 금액을 입력하세요. 남은 금액은 배분하지 않아도 됩니다.
                </p>
              </div>
            </div>
            {/* Remaining pill */}
            <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              remaining < -0.5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              잔여 {formatCurrency(Math.max(0, remaining), sym)}
            </div>
          </div>

          {/* Allocation rows */}
          <div className="space-y-2">
            {[...assets.map((a) => ({ key: a.id, label: a.name, sub: a.asset_class })),
              { key: CASH_KEY, label: '현금으로 보유', sub: 'Cash' },
            ].map(({ key, label, sub }) => (
              <div key={key} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-green-100">
                <span className="text-sm font-medium text-foreground flex-1 truncate">{label}</span>
                <span className="text-xs text-muted-foreground shrink-0">{sub}</span>
                {remaining > 0.5 && (
                  <button
                    onClick={() => handleAllocateRest(key)}
                    className="shrink-0 text-xs text-green-700 font-medium border border-green-300 rounded px-2 py-0.5 hover:bg-green-50 transition-colors"
                  >
                    +나머지
                  </button>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">{sym}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={allocationInputs[key] ?? ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-28 text-right text-sm font-medium bg-transparent border-b border-gray-300 focus:border-green-500 focus:outline-none tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">/월</span>
                </div>
              </div>
            ))}
          </div>

          {/* Apply */}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={totalAllocating <= 0 || remaining < -0.5}
              onClick={handleApply}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              배분 적용 ({formatCurrency(totalAllocating, sym)}/월)
            </Button>
          </div>
        </div>
      )}

      <AssetForm
        open={formOpen}
        onClose={handleClose}
        editAsset={editAsset}
        prefillValues={prefillValues}
      />
    </div>
  )
}

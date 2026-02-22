'use client'

import { Asset } from '@/types'
import { useStore } from '@/lib/store'
import { assetAfterTaxValue, assetGain } from '@/lib/calculator'
import { formatCurrency, formatPct } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, TrendingUp } from 'lucide-react'

const assetClassColors: Record<string, string> = {
  Cash: 'bg-green-50 text-green-700 border-green-200',
  Stocks: 'bg-blue-50 text-blue-700 border-blue-200',
  'Real Estate': 'bg-amber-50 text-amber-700 border-amber-200',
  Crypto: 'bg-orange-50 text-orange-700 border-orange-200',
  Bonds: 'bg-purple-50 text-purple-700 border-purple-200',
  Other: 'bg-gray-50 text-gray-600 border-gray-200',
}

const assetClassLabels: Record<string, string> = {
  Cash: '현금',
  Stocks: '주식',
  'Real Estate': '부동산',
  Crypto: '암호화폐',
  Bonds: '채권',
  Other: '기타',
}

interface AssetCardProps {
  asset: Asset
  onEdit: (asset: Asset) => void
}

export function AssetCard({ asset, onEdit }: AssetCardProps) {
  const { deleteAsset, settings } = useStore()
  const sym = settings.currency_symbol
  const afterTaxVal = assetAfterTaxValue(asset)
  const gain = assetGain(asset)

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-foreground truncate">{asset.name}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${assetClassColors[asset.asset_class] ?? assetClassColors.Other}`}
              >
                {assetClassLabels[asset.asset_class] ?? asset.asset_class}
              </Badge>
            </div>
            {asset.notes && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{asset.notes}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(asset)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:text-destructive"
              onClick={() => deleteAsset(asset.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">세후 가치</p>
            <p className="font-semibold text-primary">{formatCurrency(afterTaxVal, sym)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">현재 가치</p>
            <p className="font-medium">{formatCurrency(asset.current_value, sym)}</p>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-600 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">연간 수익률</p>
              <p className="font-medium text-green-600">{formatPct(asset.annual_roi_pct)}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">미실현 이익</p>
            <p className={`font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(gain, sym)}
            </p>
          </div>
          {asset.monthly_contribution > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">월 납입금</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium">{formatCurrency(asset.monthly_contribution, sym)}/월</p>
                {settings.monthly_income > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    소득의 {((asset.monthly_contribution / settings.monthly_income) * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

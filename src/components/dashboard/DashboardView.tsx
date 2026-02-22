'use client'

import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import {
  totalNetWorth,
  monthlyPassiveIncome,
  fireNumber,
  projectNetWorth,
  assetAfterTaxValue,
  assetAfterTaxRoi,
} from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'
import { KpiCard } from './KpiCard'
import { ProjectionChart } from './ProjectionChart'
import { FinancialProfilePanel } from './FinancialProfilePanel'
import { MilestonesPanel } from './MilestonesPanel'
import { AllocationChart } from './AllocationChart'
import { ProjectionTable } from './ProjectionTable'
import { ShieldCheck, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardView({ onNavigate }: { onNavigate?: (tab: 'assets' | 'settings') => void }) {
  const { assets, debts, settings } = useStore()
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('privacy-banner-dismissed')) {
      setBannerVisible(true)
    }
  }, [])

  function dismissBanner() {
    localStorage.setItem('privacy-banner-dismissed', '1')
    setBannerVisible(false)
  }
  const sym = settings.currency_symbol
  const currentAge = settings.current_age ?? 30

  const netWorth = useMemo(() => totalNetWorth(assets, debts), [assets, debts])
  const passiveIncome = useMemo(
    () => monthlyPassiveIncome(netWorth, settings),
    [netWorth, settings],
  )
  const postRetirementMonthly = useMemo(() => {
    const work = settings.post_retirement_work ?? 'none'
    const minWage = settings.min_wage_monthly ?? 2_060_740
    if (work === 'full') return minWage
    if (work === 'half') return minWage / 2
    return 0
  }, [settings])
  const target = useMemo(() => fireNumber(settings, postRetirementMonthly), [settings, postRetirementMonthly])
  const projection = useMemo(
    () => projectNetWorth(assets, debts, settings, 360, postRetirementMonthly),
    [assets, debts, settings, postRetirementMonthly],
  )

  const weightedRoi = useMemo(() => {
    const totalVal = assets.reduce((sum, a) => sum + assetAfterTaxValue(a), 0)
    if (totalVal === 0) return 0
    return assets.reduce((sum, a) => sum + (assetAfterTaxValue(a) / totalVal) * assetAfterTaxRoi(a) * 100, 0)
  }, [assets])

  const inflation = (settings.inflation_rate ?? 0) / 100
  const fireMonthIndex = target > 0
    ? projection.findIndex((v, i) => v >= target * Math.pow(1 + inflation, i / 12))
    : -1

  const adjustedFireTarget = fireMonthIndex >= 0 && inflation > 0
    ? Math.round(target * Math.pow(1 + inflation, fireMonthIndex / 12))
    : target

  const adjustedMonthlyGoal = fireMonthIndex >= 0 && inflation > 0
    ? Math.round(settings.fire_monthly_goal * Math.pow(1 + inflation, fireMonthIndex / 12))
    : settings.fire_monthly_goal

  const timeToFire = fireMonthIndex >= 0
    ? (() => {
        const totalMonths = fireMonthIndex + 1
        const yrs = Math.floor(totalMonths / 12)
        const mos = totalMonths % 12
        return yrs > 0 && mos > 0
          ? `${yrs}년 ${mos}개월 후 FIRE`
          : yrs > 0
          ? `${yrs}년 후 FIRE`
          : `${mos}개월 후 FIRE`
      })()
    : target > 0 ? '30년 이내 FIRE 달성 불가' : undefined

  return (
    <div className="p-4 md:p-8 space-y-5">
      {/* Privacy notice */}
      {bannerVisible && (
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 border border-border px-4 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 shrink-0 text-green-600" />
          <span className="flex-1">
            모든 데이터는 이 기기의 브라우저에만 저장되며 어떠한 서버에도 전송되지 않습니다.
            데이터를 보존하려면{' '}
            <button
              onClick={() => onNavigate?.('settings')}
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors"
            >
              설정
            </button>
            에서 JSON으로 내보내기 하세요.
          </span>
          <button
            onClick={dismissBanner}
            className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="순자산"
          tooltip="세후 자산 합계에서 부채 잔액 합계를 뺀 값입니다."
          value={formatCurrency(netWorth, sym)}
          subValue={adjustedFireTarget > 0 ? `FIRE까지 ${Math.min(100, Math.round((netWorth / adjustedFireTarget) * 100))}%` : undefined}
          subValue2={timeToFire}
          featured
        />
        <KpiCard
          label="FIRE 목표액"
          tooltip="(월 목표 × 12) ÷ 안전 인출률로 계산한 필요 총 자산. 물가 상승률을 반영해 은퇴 시점까지 조정된 금액을 표시합니다."
          value={formatCurrency(adjustedFireTarget, sym)}
          subValue={
            inflation > 0 && fireMonthIndex >= 0
              ? `오늘 기준 ${formatCurrency(Math.max(0, settings.fire_monthly_goal - postRetirementMonthly), sym)}/월`
              : `${formatCurrency(Math.max(0, settings.fire_monthly_goal - postRetirementMonthly), sym)}/월 목표`
          }
          subValue2={
            inflation > 0 && fireMonthIndex >= 0
              ? `은퇴 시 ${formatCurrency(adjustedMonthlyGoal, sym)}/월`
              : undefined
          }
        />
        <KpiCard
          label="포트폴리오 수익률"
          tooltip="보유 자산의 세후 연 수익률을 현재 가치 기준으로 가중 평균한 값입니다. 자산 성장 예측에 이 수익률이 사용됩니다."
          value={assets.length > 0 ? `${weightedRoi.toFixed(2)}%` : '-'}
          subValue={assets.length > 0 ? '세후 가중 평균 연 수익률' : '자산을 추가하세요'}
        />
        <KpiCard
          label="패시브 인컴 (현재 기준)"
          tooltip="지금 은퇴한다면 순자산 × 안전 인출률 ÷ 12로 계산된 월 인출 가능 금액입니다."
          value={formatCurrency(passiveIncome, sym)}
          subValue={`/월 (안전 인출률 ${settings.safe_withdrawal_rate}% 기준)`}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Left: Financial Profile Panel */}
        <FinancialProfilePanel />

        {/* Right: Chart + Milestones */}
        <div className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">자산 성장 예측</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectionChart
                data={projection}
                fireNumber={adjustedFireTarget}
                currencySymbol={sym}
                currentAge={currentAge}
              />
            </CardContent>
          </Card>

          <MilestonesPanel
            projection={projection}
            fireNumber={adjustedFireTarget}
            currentAge={currentAge}
            currencySymbol={sym}
            inflationRate={settings.inflation_rate ?? 0}
          />

          <AllocationChart />
        </div>
      </div>

      {/* Year-by-year projection table */}
      {assets.length > 0 && (
        <ProjectionTable
          projection={projection}
          fireNumber={adjustedFireTarget}
          currentAge={currentAge}
          currencySymbol={sym}
          monthlyIncome={settings.monthly_income}
          salaryGrowthRate={settings.salary_growth_rate ?? 0}
          salaryCap={settings.salary_cap ?? 0}
          retirementAge={settings.retirement_age ?? 60}
          postRetirementWork={settings.post_retirement_work ?? 'none'}
          minWageMonthly={settings.min_wage_monthly ?? 2_060_740}
          inflationRate={settings.inflation_rate ?? 0}
        />
      )}

      {/* Empty state */}
      {assets.length === 0 && debts.length === 0 && (
        <div className="rounded-xl border border-border border-dashed p-10 text-center space-y-3">
          <p className="text-4xl">🚀</p>
          <p className="font-semibold text-foreground">시작하기</p>
          <p className="text-sm text-muted-foreground">
            자산과 부채를 추가하면 FIRE 예측, 이정표, 자산 성장 차트가 활성화됩니다.
          </p>
          <button
            onClick={() => onNavigate?.('assets')}
            className="inline-flex items-center gap-2 mt-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            첫 자산 추가하기 →
          </button>
        </div>
      )}
    </div>
  )
}

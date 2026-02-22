'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/info-tooltip'

type PeriodMode = 'annual' | 'monthly'
type FireGoalMode = 'total' | 'passive'

function formatKrwAnnual(annual: number): string {
  if (annual >= 100_000_000) return `₩${(annual / 100_000_000).toFixed(2)}억`
  if (annual >= 10_000) return `₩${Math.round(annual / 10_000)}만`
  return `₩${Math.round(annual).toLocaleString('ko-KR')}`
}

/** Insert thousand-separator commas while preserving a trailing decimal point. */
function addCommas(str: string): string {
  const [int, dec] = str.split('.')
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
}

function SliderRow({
  label,
  tooltip,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  inputUnit = 1,
  inputSuffix = '',
  inputStep: _inputStep = 1,
}: {
  label: string
  tooltip?: string
  value: number
  displayValue: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  inputUnit?: number
  inputSuffix?: string
  inputStep?: number
}) {
  // draft holds the comma-formatted string the user is editing; null = use committed value
  const [draft, setDraft] = useState<string | null>(null)

  const scaledValue = Math.round((value / inputUnit) * 100) / 100
  const inputDisplayValue = draft ?? addCommas(String(scaledValue))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '') // strip commas before validating
    if (!/^\d*\.?\d*$/.test(raw)) return        // only digits + optional decimal
    setDraft(raw === '' ? '' : addCommas(raw))
  }

  function commit(displayVal: string) {
    const parsed = parseFloat(displayVal.replace(/,/g, ''))
    if (!isNaN(parsed)) {
      const clamped = Math.min(max / inputUnit, Math.max(min / inputUnit, parsed))
      onChange(clamped * inputUnit)
    }
    setDraft(null)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={inputDisplayValue}
            onChange={handleChange}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="w-28 text-right text-sm font-medium text-foreground bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-500 focus:outline-none tabular-nums"
          />
          {inputSuffix && (
            <span className="text-xs text-muted-foreground shrink-0">{inputSuffix}</span>
          )}
        </div>
      </div>
      {/* Friendly formatted summary for money fields */}
      {inputUnit > 1 && (
        <p className="text-xs text-muted-foreground text-right -mt-0.5">{displayValue}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          setDraft(null)
          onChange(Number(e.target.value))
        }}
        className="w-full"
      />
    </div>
  )
}

export function FinancialProfilePanel() {
  const { settings, updateSettings } = useStore()
  const sym = settings.currency_symbol
  const isKrw = sym === '₩'

  const [mode, setMode] = useState<PeriodMode>('annual')
  const isAnnual = mode === 'annual'

  // Values shown to user depend on mode
  const incomeDisplay = isAnnual ? Math.round(settings.monthly_income * 12) : Math.round(settings.monthly_income)
  const spendDisplay  = isAnnual ? Math.round(settings.monthly_spend  * 12) : Math.round(settings.monthly_spend)

  // Slider config per mode
  const incomeMax  = isKrw ? (isAnnual ? 200_000_000 : 20_000_000) : (isAnnual ? 500_000 : 42_000)
  const incomeStep = isKrw ? (isAnnual ? 1_000_000   : 100_000)    : (isAnnual ? 5_000   : 500)
  const spendMax   = isKrw ? (isAnnual ? 100_000_000 : 10_000_000) : (isAnnual ? 300_000 : 25_000)
  const spendStep  = isKrw ? (isAnnual ? 1_000_000   : 100_000)    : (isAnnual ? 2_000   : 200)

  const [fireGoalMode, setFireGoalMode] = useState<FireGoalMode>('total')

  // FIRE goal (total portfolio target) derived from monthly goal + SWR
  const fireTarget = settings.safe_withdrawal_rate > 0
    ? Math.round(settings.fire_monthly_goal * 12 / (settings.safe_withdrawal_rate / 100))
    : 0

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">재무 프로필</CardTitle>
          {/* Annual / Monthly toggle */}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button
              onClick={() => setMode('annual')}
              className={`px-2.5 py-1 transition-colors ${isAnnual ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-gray-100'}`}
            >
              연간
            </button>
            <button
              onClick={() => setMode('monthly')}
              className={`px-2.5 py-1 transition-colors ${!isAnnual ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-gray-100'}`}
            >
              월간
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <SliderRow
          label="현재 나이"
          tooltip="이정표 달성 나이와 FIRE 예상 나이 계산에 사용됩니다."
          value={settings.current_age ?? 30}
          displayValue={`${settings.current_age ?? 30}세`}
          min={18}
          max={70}
          step={1}
          onChange={(v) => updateSettings({ current_age: v })}
          inputUnit={1}
          inputSuffix="세"
          inputStep={1}
        />

        <SliderRow
          label={isAnnual ? '연간 소득' : '월 소득'}
          tooltip="저축률 및 미배분 자금 계산에 사용됩니다. 예측 모델에서 연봉 인상률만큼 매년 증가한다고 가정합니다."
          value={incomeDisplay}
          displayValue={isKrw ? formatKrwAnnual(incomeDisplay) : `$${Math.round(incomeDisplay / (isAnnual ? 1_000 : 100))}${isAnnual ? 'k' : ''}`}
          min={0}
          max={incomeMax}
          step={incomeStep}
          onChange={(v) => updateSettings({ monthly_income: isAnnual ? v / 12 : v })}
          inputUnit={isKrw ? 10_000 : (isAnnual ? 1_000 : 1)}
          inputSuffix={isKrw ? '만원' : (isAnnual ? 'k' : '')}
          inputStep={isKrw ? (isAnnual ? 100 : 10) : (isAnnual ? 10 : 1)}
        />

        <SliderRow
          label={isAnnual ? '연간 지출' : '월 지출'}
          tooltip="순 저축액 계산에 사용됩니다. 예측 모델에서 물가 상승률만큼 매년 증가하며, 그만큼 투자 가능 금액이 줄어듭니다."
          value={spendDisplay}
          displayValue={isKrw ? formatKrwAnnual(spendDisplay) : `$${Math.round(spendDisplay / (isAnnual ? 1_000 : 100))}${isAnnual ? 'k' : ''}`}
          min={0}
          max={spendMax}
          step={spendStep}
          onChange={(v) => updateSettings({ monthly_spend: isAnnual ? v / 12 : v })}
          inputUnit={isKrw ? 10_000 : (isAnnual ? 1_000 : 1)}
          inputSuffix={isKrw ? '만원' : (isAnnual ? 'k' : '')}
          inputStep={isKrw ? (isAnnual ? 100 : 10) : (isAnnual ? 10 : 1)}
        />

        <SliderRow
          label="연봉 인상률"
          tooltip="매년 자산 납입금이 이 비율만큼 증가한다고 가정합니다. 예: 3% 인상률이면 5년 후 납입금은 약 16% 증가합니다."
          value={settings.salary_growth_rate ?? 3}
          displayValue={`${(settings.salary_growth_rate ?? 3).toFixed(1)}%/년`}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => updateSettings({ salary_growth_rate: v })}
          inputUnit={1}
          inputSuffix="%"
          inputStep={0.5}
        />

        <SliderRow
          label="물가 상승률"
          tooltip="지출이 매년 이 비율만큼 증가한다고 가정합니다. 또한 FIRE 목표액도 이 비율로 조정되어 은퇴 시점의 실질 필요 자산을 계산합니다."
          value={settings.inflation_rate ?? 2}
          displayValue={`${(settings.inflation_rate ?? 2).toFixed(1)}%/년`}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => updateSettings({ inflation_rate: v })}
          inputUnit={1}
          inputSuffix="%"
          inputStep={0.5}
        />

        {/* FIRE goal section with mode toggle */}
        <div className="pt-1 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">FIRE 목표 설정</span>
              <p className="text-xs text-muted-foreground/70 mt-0.5">현재 화폐 가치 기준 · 물가 반영 목표액은 대시보드에서 확인</p>
            </div>
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button
                onClick={() => setFireGoalMode('total')}
                className={`px-2.5 py-1 transition-colors ${fireGoalMode === 'total' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-gray-100'}`}
              >
                총 자산
              </button>
              <button
                onClick={() => setFireGoalMode('passive')}
                className={`px-2.5 py-1 transition-colors ${fireGoalMode === 'passive' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-gray-100'}`}
              >
                월 인컴
              </button>
            </div>
          </div>

          <SliderRow
            label="안전 인출률"
            tooltip="은퇴 후 포트폴리오에서 매년 인출하는 비율. FIRE 목표액 = (월 목표 × 12) ÷ 안전 인출률. 4% 법칙이 일반적으로 사용됩니다."
            value={settings.safe_withdrawal_rate}
            displayValue={`${settings.safe_withdrawal_rate.toFixed(1)}%`}
            min={2}
            max={10}
            step={0.1}
            onChange={(v) => updateSettings({ safe_withdrawal_rate: v })}
            inputUnit={1}
            inputSuffix="%"
            inputStep={0.1}
          />

          {fireGoalMode === 'total' ? (
            <SliderRow
              label="목표 총 자산"
              tooltip="이 금액에 도달하면 안전 인출률로 목표 월 소득을 영구적으로 인출할 수 있습니다. 현재 화폐 가치 기준이며, 물가 반영 목표는 대시보드에서 확인하세요."
              value={fireTarget}
              displayValue={isKrw ? formatKrwAnnual(fireTarget) : formatCurrency(fireTarget, sym)}
              min={0}
              max={isKrw ? 5_000_000_000 : 10_000_000}
              step={isKrw ? 50_000_000 : 100_000}
              onChange={(v) => updateSettings({
                fire_monthly_goal: settings.safe_withdrawal_rate > 0
                  ? v * (settings.safe_withdrawal_rate / 100) / 12
                  : settings.fire_monthly_goal,
              })}
              inputUnit={isKrw ? 100_000_000 : 100_000}
              inputSuffix={isKrw ? '억' : '00k'}
              inputStep={0.5}
            />
          ) : (
            <SliderRow
              label="목표 월 패시브 인컴"
              tooltip="은퇴 후 매월 안전하게 인출하고 싶은 금액 (현재 화폐 가치 기준). 필요 총 자산 = 이 금액 × 12 ÷ 안전 인출률."
              value={settings.fire_monthly_goal}
              displayValue={isKrw ? formatKrwAnnual(settings.fire_monthly_goal) : formatCurrency(settings.fire_monthly_goal, sym)}
              min={0}
              max={isKrw ? 20_000_000 : 50_000}
              step={isKrw ? 100_000 : 500}
              onChange={(v) => updateSettings({ fire_monthly_goal: v })}
              inputUnit={isKrw ? 10_000 : 1_000}
              inputSuffix={isKrw ? '만원' : 'k'}
              inputStep={isKrw ? 10 : 1}
            />
          )}

          {/* Derived summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {fireGoalMode === 'total' ? '→ 월 패시브 인컴' : '→ 필요 총 자산'}
              </span>
              <span className="font-medium text-foreground">
                {fireGoalMode === 'total'
                  ? `${formatCurrency(settings.fire_monthly_goal, sym)}/월`
                  : formatKrwAnnual(fireTarget)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">월 저축액</span>
              <span className={`font-medium ${settings.monthly_income > settings.monthly_spend ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(settings.monthly_income - settings.monthly_spend, sym)}/월
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

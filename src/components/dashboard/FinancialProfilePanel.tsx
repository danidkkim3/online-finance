'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { ChevronDown, ChevronRight } from 'lucide-react'

type FireGoalMode = 'total' | 'passive'

function formatKrwAnnual(annual: number): string {
  if (annual >= 100_000_000) return `₩${(annual / 100_000_000).toFixed(2)}억`
  if (annual >= 10_000) return `₩${Math.round(annual / 10_000)}만`
  return `₩${Math.round(annual).toLocaleString('ko-KR')}`
}

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
  const [draft, setDraft] = useState<string | null>(null)
  const scaledValue = Math.round((value / inputUnit) * 100) / 100
  const inputDisplayValue = draft ?? addCommas(String(scaledValue))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, '')
    if (!/^\d*\.?\d*$/.test(raw)) return
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
      {inputUnit > 1 && (
        <p className="text-xs text-muted-foreground text-right -mt-0.5">{displayValue}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => { setDraft(null); onChange(Number(e.target.value)) }}
        className="w-full"
      />
    </div>
  )
}

export function FinancialProfilePanel() {
  const { settings, updateSettings } = useStore()
  const sym = settings.currency_symbol
  const isKrw = sym === '₩'

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [fireGoalMode, setFireGoalMode] = useState<FireGoalMode>('total')

  const annualIncome = Math.round(settings.monthly_income * 12)
  const annualSpend  = Math.round(settings.monthly_spend  * 12)

  const incomeMax  = isKrw ? 200_000_000 : 500_000
  const incomeStep = isKrw ? 1_000_000   : 5_000
  const spendMax   = isKrw ? 100_000_000 : 300_000
  const spendStep  = isKrw ? 1_000_000   : 2_000

  const fireTarget = settings.safe_withdrawal_rate > 0
    ? Math.round(settings.fire_monthly_goal * 12 / (settings.safe_withdrawal_rate / 100))
    : 0

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardContent className="pt-5 space-y-5">

        {/* ── 프로필 ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">프로필</h3>

          {/* 현재 나이 — plain input, no slider */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              현재 나이
              <InfoTooltip text="이정표 달성 나이와 FIRE 예상 나이 계산에 사용됩니다." />
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={10}
                max={100}
                value={settings.current_age ?? 30}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 10 && v <= 100) updateSettings({ current_age: v })
                }}
                className="w-16 text-right text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-500 focus:outline-none tabular-nums"
              />
              <span className="text-xs text-muted-foreground">세</span>
            </div>
          </div>

          <SliderRow
            label="연간 소득"
            tooltip="저축률 및 미배분 자금 계산에 사용됩니다. 예측 모델에서 연봉 인상률만큼 매년 증가합니다."
            value={annualIncome}
            displayValue={isKrw ? formatKrwAnnual(annualIncome) : formatCurrency(annualIncome, sym)}
            min={0}
            max={incomeMax}
            step={incomeStep}
            onChange={(v) => updateSettings({ monthly_income: v / 12 })}
            inputUnit={isKrw ? 10_000 : 1_000}
            inputSuffix={isKrw ? '만원' : 'k'}
            inputStep={isKrw ? 100 : 10}
          />

          <SliderRow
            label="연간 지출"
            tooltip="순 저축액 계산에 사용됩니다. 예측 모델에서 물가 상승률만큼 매년 증가하며, 그만큼 투자 가능 금액이 줄어듭니다."
            value={annualSpend}
            displayValue={isKrw ? formatKrwAnnual(annualSpend) : formatCurrency(annualSpend, sym)}
            min={0}
            max={spendMax}
            step={spendStep}
            onChange={(v) => updateSettings({ monthly_spend: v / 12 })}
            inputUnit={isKrw ? 10_000 : 1_000}
            inputSuffix={isKrw ? '만원' : 'k'}
            inputStep={isKrw ? 100 : 10}
          />

          {/* 고급 collapsible */}
          <div className="border border-border/60 rounded-lg overflow-hidden">
            <button
              onClick={() => setAdvancedOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <span className="font-medium">고급</span>
              {advancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {advancedOpen && (
              <div className="px-3 pb-3 pt-1 space-y-4 border-t border-border/60">
                <SliderRow
                  label="연봉 인상률"
                  tooltip="매년 소득이 이 비율만큼 증가한다고 가정합니다. 증가분은 투자 납입금으로 반영됩니다."
                  value={settings.salary_growth_rate ?? 5}
                  displayValue={`${(settings.salary_growth_rate ?? 5).toFixed(1)}%/년`}
                  min={0}
                  max={20}
                  step={0.5}
                  onChange={(v) => updateSettings({ salary_growth_rate: v })}
                  inputUnit={1}
                  inputSuffix="%"
                  inputStep={0.5}
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                      연봉 상한선
                      <InfoTooltip text="연봉이 이 금액을 초과하지 않도록 합니다. 비워두거나 0이면 상한 없음." />
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          (settings.salary_cap ?? 0) === 0
                            ? ''
                            : addCommas(String(Math.round((settings.salary_cap ?? 0) / (isKrw ? 10_000 : 1_000))))
                        }
                        placeholder="제한 없음"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '')
                          if (raw === '') { updateSettings({ salary_cap: 0 }); return }
                          const parsed = parseFloat(raw)
                          if (!isNaN(parsed)) updateSettings({ salary_cap: parsed * (isKrw ? 10_000 : 1_000) })
                        }}
                        className="w-28 text-right text-sm font-medium text-foreground bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-500 focus:outline-none tabular-nums placeholder:text-gray-400"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">{isKrw ? '만원' : 'k'}</span>
                    </div>
                  </div>
                  {(settings.salary_cap ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {isKrw ? formatKrwAnnual(settings.salary_cap ?? 0) : formatCurrency(settings.salary_cap ?? 0, sym)}
                    </p>
                  )}
                </div>

                <SliderRow
                  label="물가 상승률"
                  tooltip="지출이 매년 이 비율만큼 증가합니다. FIRE 목표액도 이 비율로 조정되어 은퇴 시점의 실질 필요 자산을 계산합니다."
                  value={settings.inflation_rate ?? 3}
                  displayValue={`${(settings.inflation_rate ?? 3).toFixed(1)}%/년`}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => updateSettings({ inflation_rate: v })}
                  inputUnit={1}
                  inputSuffix="%"
                  inputStep={0.5}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── FIRE 목표 설정 ── */}
        <div className="pt-1 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">FIRE 목표 설정</h3>
              <p className="text-xs text-muted-foreground/70 mt-0.5">현재 화폐 가치 기준</p>
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
                월 수익
              </button>
            </div>
          </div>

          {fireGoalMode === 'total' ? (
            <SliderRow
              label="목표 총 자산"
              tooltip="이 금액에 도달하면 안전 인출률로 목표 월 소득을 영구적으로 인출할 수 있습니다."
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
              label="목표 월 수익"
              tooltip="은퇴 후 매월 안전하게 인출하고 싶은 금액. 필요 총 자산 = 이 금액 × 12 ÷ 안전 인출률."
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

          <SliderRow
            label="안전 인출률"
            tooltip="은퇴 후 포트폴리오에서 매년 인출하는 비율. FIRE 목표액 = (월 목표 × 12) ÷ 안전 인출률. 통상적으로 4% 추천."
            value={settings.safe_withdrawal_rate}
            displayValue={`${settings.safe_withdrawal_rate.toFixed(1)}% (통상 4% 추천)`}
            min={2}
            max={10}
            step={0.1}
            onChange={(v) => updateSettings({ safe_withdrawal_rate: v })}
            inputUnit={1}
            inputSuffix="%"
            inputStep={0.1}
          />

          {/* 은퇴 후 근로소득 + 은퇴 나이 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                은퇴 후 근로소득
                <InfoTooltip text="은퇴 후 파트타임 근로 소득을 설정하면 필요한 FIRE 목표액이 줄어듭니다. 소득은 물가 상승률에 따라 자동 조정됩니다." />
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">은퇴 나이</span>
                <input
                  type="number"
                  min={settings.current_age ?? 30}
                  max={100}
                  value={settings.retirement_age ?? 60}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) updateSettings({ retirement_age: v })
                  }}
                  className="w-14 text-right text-sm font-medium bg-transparent border-b border-gray-300 focus:border-gray-500 focus:outline-none tabular-nums"
                />
                <span className="text-muted-foreground">세</span>
              </div>
            </div>

            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              {(['none', 'half', 'full'] as const).map((opt) => {
                const labels = { none: '비근로', half: '최저임금 50%', full: '최저임금 100%' }
                const active = (settings.post_retirement_work ?? 'none') === opt
                return (
                  <button
                    key={opt}
                    onClick={() => updateSettings({ post_retirement_work: opt })}
                    className={`flex-1 px-2 py-1.5 transition-colors ${active ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-gray-100'}`}
                  >
                    {labels[opt]}
                  </button>
                )
              })}
            </div>

            {(settings.post_retirement_work ?? 'none') !== 'none' && (
              <SliderRow
                label="최저임금 (월)"
                tooltip="은퇴 후 파트타임 근로 시 기준이 되는 월 최저임금입니다."
                value={settings.min_wage_monthly ?? 2_060_740}
                displayValue={isKrw ? formatKrwAnnual(settings.min_wage_monthly ?? 2_060_740) : formatCurrency(settings.min_wage_monthly ?? 2_060_740, sym)}
                min={isKrw ? 500_000 : 500}
                max={isKrw ? 10_000_000 : 20_000}
                step={isKrw ? 10_000 : 100}
                onChange={(v) => updateSettings({ min_wage_monthly: v })}
                inputUnit={isKrw ? 10_000 : 1_000}
                inputSuffix={isKrw ? '만원' : 'k'}
                inputStep={1}
              />
            )}
          </div>

          {/* Summary row */}
          <div className="space-y-1 text-sm pt-1 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {fireGoalMode === 'total' ? '→ 월 패시브 인컴' : '→ 필요 총 자산'}
              </span>
              <span className="font-medium text-foreground">
                {fireGoalMode === 'total'
                  ? `${formatCurrency(settings.fire_monthly_goal, sym)}/월`
                  : isKrw ? formatKrwAnnual(fireTarget) : formatCurrency(fireTarget, sym)}
              </span>
            </div>
            {(settings.post_retirement_work ?? 'none') !== 'none' && (() => {
              const minWage = settings.min_wage_monthly ?? 2_060_740
              const earned = settings.post_retirement_work === 'full' ? minWage : minWage / 2
              const adjustedGoal = Math.max(0, settings.fire_monthly_goal - earned)
              const adjustedTarget = settings.safe_withdrawal_rate > 0
                ? Math.round(adjustedGoal * 12 / (settings.safe_withdrawal_rate / 100))
                : 0
              return (
                <div className="flex justify-between text-xs">
                  <span className="text-green-700">→ 근로소득 반영 후 필요 자산</span>
                  <span className="font-medium text-green-700">
                    {isKrw ? formatKrwAnnual(adjustedTarget) : formatCurrency(adjustedTarget, sym)}
                  </span>
                </div>
              )
            })()}
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

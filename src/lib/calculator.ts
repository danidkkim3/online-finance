import { Asset, Debt, MortgageRepaymentType, Settings } from '@/types'

/** Capital gain above cost basis, floored at 0 */
export function assetGain(asset: Asset): number {
  return Math.max(0, asset.current_value - asset.cost_basis)
}

/** After-tax value of an asset */
export function assetAfterTaxValue(asset: Asset): number {
  const gain = assetGain(asset)
  switch (asset.tax_type) {
    case 'flat_dollar':
      return Math.max(0, asset.current_value - asset.tax_value)
    case 'pct_total':
      return asset.current_value * (1 - asset.tax_value / 100)
    case 'pct_appreciation':
      return asset.current_value - gain * (asset.tax_value / 100)
    default:
      return asset.current_value
  }
}

/** Effective annual ROI after accounting for flat-dollar tax drag */
export function assetAfterTaxRoi(asset: Asset): number {
  if (asset.tax_type === 'flat_dollar' && asset.current_value > 0) {
    const drag = asset.tax_value / asset.current_value
    return Math.max(0, asset.annual_roi_pct / 100 - drag)
  }
  return asset.annual_roi_pct / 100
}

/**
 * How many full months have elapsed since a YYYY-MM-DD (or YYYY-MM) start date.
 * Returns 0 for future/invalid dates.
 */
export function calcMonthsElapsed(startDate: string): number {
  const parts = startDate.split('-').map(Number)
  const y = parts[0], m = parts[1]
  if (!y || !m) return 0
  const now = new Date()
  const elapsed = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  return Math.max(0, elapsed)
}

/**
 * Remaining loan balance after monthsElapsed payments.
 * Handles grace period (interest-only) followed by repayment phase.
 */
export function calcRemainingBalance(
  originalBalance: number,
  annualRatePct: number,
  totalTermMonths: number,
  gracePeriodMonths: number,
  repaymentType: MortgageRepaymentType,
  monthsElapsed: number,
): number {
  if (monthsElapsed <= 0) return originalBalance
  if (monthsElapsed >= totalTermMonths) return 0

  const r = annualRatePct / 100 / 12
  const repaymentTerm = Math.max(1, totalTermMonths - gracePeriodMonths)
  const repaymentMonthsElapsed = Math.max(0, monthsElapsed - gracePeriodMonths)

  // Still in grace period — no principal paid
  if (repaymentMonthsElapsed === 0) return originalBalance

  if (repaymentType === 'equal_payment') {
    if (r === 0) return Math.max(0, originalBalance - (originalBalance / repaymentTerm) * repaymentMonthsElapsed)
    const P = (originalBalance * r * Math.pow(1 + r, repaymentTerm)) / (Math.pow(1 + r, repaymentTerm) - 1)
    const remaining = originalBalance * Math.pow(1 + r, repaymentMonthsElapsed)
      - P * (Math.pow(1 + r, repaymentMonthsElapsed) - 1) / r
    return Math.max(0, remaining)
  }

  if (repaymentType === 'equal_principal') {
    const monthlyPrincipal = originalBalance / repaymentTerm
    return Math.max(0, originalBalance - monthlyPrincipal * repaymentMonthsElapsed)
  }

  if (repaymentType === 'graduated') {
    // Simulate month-by-month (no closed form)
    const annualIncrement = 0.02
    let discountSum = 0
    for (let m = 1; m <= repaymentTerm; m++) {
      discountSum += Math.pow(1 + annualIncrement, Math.floor((m - 1) / 12)) / Math.pow(1 + r, m)
    }
    const p1 = discountSum > 0 ? originalBalance / discountSum : 0
    let balance = originalBalance
    for (let m = 1; m <= repaymentMonthsElapsed; m++) {
      const payment = p1 * Math.pow(1 + annualIncrement, Math.floor((m - 1) / 12))
      const interest = balance * r
      balance = Math.max(0, balance - Math.max(0, payment - interest))
    }
    return balance
  }

  return originalBalance
}

/**
 * Monthly mortgage payment for a given loan month (1-based).
 * During grace period: interest only.
 * After grace period: based on repayment type.
 *
 * @param principal        Remaining balance at projection start
 * @param annualRatePct    Annual interest rate (e.g. 3.5)
 * @param termMonths       Remaining total term (incl. grace period)
 * @param gracePeriodMonths Grace/interest-only months (from now)
 * @param repaymentType    Repayment schedule type
 * @param loanMonth        Current month in the schedule (1-based)
 */
export function mortgageMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  gracePeriodMonths: number,
  repaymentType: MortgageRepaymentType,
  loanMonth: number,
): number {
  const r = annualRatePct / 100 / 12
  const repaymentTerm = termMonths - gracePeriodMonths
  if (repaymentTerm <= 0) return principal * r

  // Grace period: interest only
  if (loanMonth <= gracePeriodMonths) return principal * r

  const repaymentMonth = loanMonth - gracePeriodMonths // 1-based within repayment

  if (repaymentType === 'equal_payment') {
    // 원리금 균등: fixed monthly payment
    if (r === 0) return principal / repaymentTerm
    return (principal * r * Math.pow(1 + r, repaymentTerm)) / (Math.pow(1 + r, repaymentTerm) - 1)
  }

  if (repaymentType === 'equal_principal') {
    // 원금 균등: fixed principal portion, decreasing interest
    const monthlyPrincipal = principal / repaymentTerm
    const remainingBalance = principal - monthlyPrincipal * (repaymentMonth - 1)
    return monthlyPrincipal + remainingBalance * r
  }

  if (repaymentType === 'graduated') {
    // 체증식: payments increase ~2 % per year
    // Solve for P1 such that Σ P1·(1.02)^⌊(m-1)/12⌋ / (1+r)^m = principal
    const annualIncrement = 0.02
    let discountSum = 0
    for (let m = 1; m <= repaymentTerm; m++) {
      discountSum += Math.pow(1 + annualIncrement, Math.floor((m - 1) / 12)) / Math.pow(1 + r, m)
    }
    if (discountSum === 0) return 0
    const p1 = principal / discountSum
    return p1 * Math.pow(1 + annualIncrement, Math.floor((repaymentMonth - 1) / 12))
  }

  return 0
}

/** FIRE number: the portfolio size needed to retire */
export function fireNumber(settings: Settings, postRetirementMonthly = 0): number {
  if (settings.safe_withdrawal_rate <= 0) return 0
  const adjustedGoal = Math.max(0, settings.fire_monthly_goal - postRetirementMonthly)
  return (adjustedGoal * 12) / (settings.safe_withdrawal_rate / 100)
}

/** Total net worth = sum(after-tax asset values) - sum(debt balances) */
export function totalNetWorth(assets: Asset[], debts: Debt[]): number {
  const totalAssets = assets.reduce((sum, a) => sum + assetAfterTaxValue(a), 0)
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  return totalAssets - totalDebt
}

/** Sum of all asset after-tax values */
export function totalAssets(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + assetAfterTaxValue(a), 0)
}

/** Sum of all debt balances */
export function totalDebt(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + d.balance, 0)
}

/** Monthly passive income from the portfolio at the safe withdrawal rate */
export function monthlyPassiveIncome(netWorth: number, settings: Settings): number {
  return Math.max(0, netWorth) * (settings.safe_withdrawal_rate / 100) / 12
}

/** FIRE progress as a percentage (0–100) */
export function fireProgressPct(netWorth: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.max(0, (netWorth / target) * 100))
}

/** Project net worth over `months` months using weighted average ROI */
export function projectNetWorth(
  assets: Asset[],
  debts: Debt[],
  settings: Settings,
  months = 360,
  postRetirementMonthly = 0,
): number[] {
  const curve: number[] = []

  let portfolioValue = assets.reduce((sum, a) => sum + assetAfterTaxValue(a), 0)
  const monthlyContribution = assets.reduce((sum, a) => sum + a.monthly_contribution, 0)

  // Weighted average monthly return
  const totalVal = assets.reduce((sum, a) => sum + assetAfterTaxValue(a), 0)
  let weightedMonthlyReturn = 0
  if (totalVal > 0) {
    for (const asset of assets) {
      const weight = assetAfterTaxValue(asset) / totalVal
      weightedMonthlyReturn += weight * (assetAfterTaxRoi(asset) / 12)
    }
  }

  // Per-debt state for dynamic payment schedules
  const debtStates = debts.map((d) => ({ debt: d, balance: d.balance, loanMonth: 1 }))

  const annualSalaryGrowth = (settings.salary_growth_rate ?? 0) / 100
  const annualInflation = (settings.inflation_rate ?? 0) / 100
  const annualSalaryCap = settings.salary_cap ?? 0
  const currentAnnualSalary = settings.monthly_income * 12

  // Retirement age overrides salary contributions
  const currentAge = settings.current_age ?? 30
  const retirementAge = settings.retirement_age ?? 60
  const retirementMonth = Math.max(0, (retirementAge - currentAge) * 12)

  // For detecting FIRE crossing (used for milestone display only)
  const fireTarget = fireNumber(settings, postRetirementMonthly)
  let fireReached = false

  for (let m = 0; m < months; m++) {
    const yearNum = Math.floor(m / 12)
    const inflationFactor = Math.pow(1 + annualInflation, yearNum)
    const isRetired = m >= retirementMonth

    let contribution: number
    if (isRetired) {
      // After retirement: salary contributions stop, post-retirement income replaces them
      contribution = postRetirementMonthly > 0 ? postRetirementMonthly * inflationFactor : 0
    } else {
      const rawGrowthFactor = Math.pow(1 + annualSalaryGrowth, yearNum)
      // Cap the growth factor so projected salary never exceeds salary_cap
      const salaryGrowthFactor = annualSalaryCap > 0 && currentAnnualSalary > 0
        ? Math.min(rawGrowthFactor, annualSalaryCap / currentAnnualSalary)
        : rawGrowthFactor
      // FIRE principle: income grows with salary, spend grows with inflation only (no lifestyle creep)
      // contribution = base + income_raise_delta - inflation_spend_delta
      const incomeGrowth = settings.monthly_income * (salaryGrowthFactor - 1)
      const spendGrowth = settings.monthly_spend * (inflationFactor - 1)
      contribution = Math.max(0, monthlyContribution + incomeGrowth - spendGrowth)
    }

    portfolioValue = portfolioValue * (1 + weightedMonthlyReturn) + contribution

    let totalDebtBalance = 0
    for (const state of debtStates) {
      if (state.balance <= 0) { state.loanMonth++; continue }

      const r = state.debt.annual_interest_rate / 100 / 12
      const d = state.debt

      let payment: number
      if (
        d.debt_class === 'Mortgage' &&
        d.repayment_type &&
        d.loan_term_months &&
        !d.manual_payment
      ) {
        // Compute remaining term / grace from start date
        const elapsed = d.loan_start_date ? calcMonthsElapsed(d.loan_start_date) : 0
        const remainingTerm = Math.max(1, d.loan_term_months - elapsed)
        const remainingGrace = Math.max(0, (d.grace_period_months ?? 0) - elapsed)

        payment = mortgageMonthlyPayment(
          d.balance,
          d.annual_interest_rate,
          remainingTerm,
          remainingGrace,
          d.repayment_type,
          state.loanMonth,
        )
      } else {
        payment = d.monthly_payment
      }

      const interest = state.balance * r
      const principalPaid = Math.max(0, Math.min(state.balance, payment - interest))
      state.balance = Math.max(0, state.balance - principalPaid)
      state.loanMonth++

      totalDebtBalance += state.balance
    }

    const netValue = portfolioValue - totalDebtBalance
    curve.push(netValue)

    if (!fireReached && fireTarget > 0 && netValue >= fireTarget * Math.pow(1 + annualInflation, m / 12)) {
      fireReached = true
    }
  }

  return curve
}

export interface Milestone {
  threshold: number
  age: number | null
  yearsFromNow: number | null
  isFire: boolean
}

/** Calculate milestones from projection data */
export function calculateMilestones(
  projection: number[],
  fireNumber: number,
  currentAge: number,
  inflationRate = 0, // annual %, e.g. 2 for 2%
): Milestone[] {
  const baseThresholds = [50_000_000, 100_000_000, 300_000_000, 500_000_000, 1_000_000_000, 3_000_000_000]
  const thresholdSet = new Set(baseThresholds)
  if (fireNumber > 0) thresholdSet.add(fireNumber)
  const thresholds = Array.from(thresholdSet).sort((a, b) => a - b)
  const r = inflationRate / 100

  return thresholds.map((threshold) => {
    const isFire = fireNumber > 0 && threshold === fireNumber
    // For the FIRE milestone, the target grows with inflation each month
    const monthIndex = isFire && r > 0
      ? projection.findIndex((v, i) => v >= threshold * Math.pow(1 + r, i / 12))
      : projection.findIndex((v) => v >= threshold)

    if (monthIndex === -1) {
      return { threshold, age: null, yearsFromNow: null, isFire }
    }
    const years = monthIndex / 12
    const age = Math.round(currentAge + years)
    return { threshold, age, yearsFromNow: parseFloat(years.toFixed(1)), isFire }
  })
}

/** Asset class breakdown for pie chart */
export function assetAllocation(assets: Asset[]): { name: string; value: number }[] {
  const map: Record<string, number> = {}
  for (const asset of assets) {
    const val = assetAfterTaxValue(asset)
    map[asset.asset_class] = (map[asset.asset_class] ?? 0) + val
  }
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
}

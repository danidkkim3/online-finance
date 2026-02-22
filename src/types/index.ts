export type TaxType = 'flat_dollar' | 'pct_total' | 'pct_appreciation'

export type AssetClass =
  | 'Cash'
  | '예금'
  | 'Stocks'
  | 'Real Estate'
  | 'Crypto'
  | 'Bonds'
  | 'Other'

export type DebtClass =
  | 'Mortgage'
  | 'Student Loan'
  | 'Auto Loan'
  | 'Credit Card'
  | 'Personal Loan'
  | 'Other'

export type MortgageRepaymentType = 'equal_payment' | 'equal_principal' | 'graduated'

export interface Asset {
  id: string
  name: string
  asset_class: AssetClass
  current_value: number
  annual_roi_pct: number
  tax_type: TaxType
  tax_value: number
  cost_basis: number
  monthly_contribution: number
  notes: string
  property_tax_pct?: number  // 재산세 — annual % of property value (Real Estate only)
  jongbuse_pct?: number      // 종부세 — comprehensive real estate tax (Real Estate only)
}

export interface Debt {
  id: string
  name: string
  debt_class: DebtClass
  balance: number
  annual_interest_rate: number
  monthly_payment: number
  notes: string
  // Mortgage-specific
  repayment_type?: MortgageRepaymentType
  grace_period_months?: number
  loan_term_months?: number
  loan_start_date?: string  // YYYY-MM-DD
  manual_payment?: boolean  // if true, use monthly_payment as-is instead of auto-calc
  original_loan_amount?: number  // initial principal at loan start
  linked_asset_id?: string  // Real Estate asset this mortgage is secured against
}

export interface Settings {
  fire_monthly_goal: number
  safe_withdrawal_rate: number
  currency_symbol: string
  monthly_income: number
  monthly_spend: number
  current_age: number
  salary_growth_rate: number  // annual % increase applied to contributions in projection
  salary_cap: number          // maximum annual salary (0 = no cap)
  inflation_rate: number      // annual % used to inflate the FIRE target over time
  post_retirement_work: 'none' | 'half' | 'full'
  min_wage_monthly: number
  retirement_age: number
}

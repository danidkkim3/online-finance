'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useStore } from '@/lib/store'
import { Debt, DebtClass, MortgageRepaymentType } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { CommaInput } from '@/components/ui/comma-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { mortgageMonthlyPayment, calcMonthsElapsed, calcRemainingBalance } from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'

const debtClasses: DebtClass[] = [
  'Mortgage', 'Student Loan', 'Auto Loan', 'Credit Card', 'Personal Loan', 'Other',
]

const debtClassLabels: Record<DebtClass, string> = {
  Mortgage: '주택담보대출',
  'Student Loan': '학자금대출',
  'Auto Loan': '자동차대출',
  'Credit Card': '신용카드',
  'Personal Loan': '개인대출',
  Other: '기타',
}

const repaymentTypes: { value: MortgageRepaymentType; label: string; desc: string }[] = [
  { value: 'equal_payment',   label: '원리금 균등', desc: '매달 동일한 금액 납입' },
  { value: 'equal_principal', label: '원금 균등',   desc: '원금 고정, 이자 감소 → 납입금 점감' },
  { value: 'graduated',       label: '체증식',      desc: '납입금이 매년 약 2% 증가' },
]

const schema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  debt_class: z.string(),
  balance: z.coerce.number().min(0),
  annual_interest_rate: z.coerce.number().min(0).max(100),
  monthly_payment: z.coerce.number().min(0),
  notes: z.string(),
  // Mortgage-specific
  repayment_type: z.enum(['equal_payment', 'equal_principal', 'graduated']).optional(),
  grace_period_months: z.coerce.number().min(0).optional(),
  loan_term_months: z.coerce.number().min(1).optional(),
  loan_start_date: z.string().optional(),
  manual_payment: z.boolean().optional(),
  original_loan_amount: z.coerce.number().min(0).optional(),
})

type FormValues = z.infer<typeof schema>

function makeDefaults(editDebt?: Debt): FormValues {
  if (editDebt) {
    return {
      name: editDebt.name,
      debt_class: editDebt.debt_class,
      balance: editDebt.balance,
      annual_interest_rate: editDebt.annual_interest_rate,
      monthly_payment: editDebt.monthly_payment,
      notes: editDebt.notes,
      repayment_type: editDebt.repayment_type,
      grace_period_months: editDebt.grace_period_months ?? 0,
      loan_term_months: editDebt.loan_term_months ?? 360,
      loan_start_date: editDebt.loan_start_date ?? '',
      manual_payment: editDebt.manual_payment ?? false,
      original_loan_amount: editDebt.original_loan_amount ?? editDebt.balance,
    }
  }
  return {
    name: '',
    debt_class: 'Other',
    balance: 0,
    annual_interest_rate: 0,
    monthly_payment: 0,
    notes: '',
    repayment_type: 'equal_payment',
    grace_period_months: 0,
    loan_term_months: 360,
    loan_start_date: '',
    manual_payment: false,
    original_loan_amount: 0,
  }
}

/** Format raw digits into YYYY-MM-DD as the user types */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

/** True when the string looks like a complete YYYY-MM-DD date */
function isCompleteDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

interface DebtFormProps {
  open: boolean
  onClose: () => void
  editDebt?: Debt
}

export function DebtForm({ open, onClose, editDebt }: DebtFormProps) {
  const { addDebt, updateDebt, settings } = useStore()
  const sym = settings.currency_symbol

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: makeDefaults(editDebt),
  })

  useEffect(() => {
    if (open) form.reset(makeDefaults(editDebt))
  }, [open, editDebt]) // eslint-disable-line react-hooks/exhaustive-deps

  const debtClass      = form.watch('debt_class')
  const isMortgage     = debtClass === 'Mortgage'
  const annualRate     = form.watch('annual_interest_rate')
  const loanTerm       = form.watch('loan_term_months') ?? 360
  const gracePeriod    = form.watch('grace_period_months') ?? 0
  const repaymentType  = form.watch('repayment_type') ?? 'equal_payment'
  const startDate      = form.watch('loan_start_date') ?? ''
  const manualPayment  = form.watch('manual_payment') ?? false
  const originalAmount = form.watch('original_loan_amount') ?? 0

  // Derived from start date
  const elapsed         = isCompleteDate(startDate) ? calcMonthsElapsed(startDate) : 0
  const remainingTerm   = Math.max(1, loanTerm - elapsed)
  const remainingGrace  = Math.max(0, gracePeriod - elapsed)
  const isInGrace       = elapsed < gracePeriod
  const repaymentMonthsIn = Math.max(0, elapsed - gracePeriod)
  const remainingRepayment = remainingTerm - remainingGrace

  // Auto-calculated current balance from original amount + schedule
  const canAutoCalcBalance = isMortgage && originalAmount > 0 && annualRate > 0
    && loanTerm > 0 && isCompleteDate(startDate)

  const autoBalance = canAutoCalcBalance
    ? Math.round(calcRemainingBalance(
        originalAmount, annualRate, loanTerm, gracePeriod, repaymentType, elapsed,
      ))
    : null

  // Sync balance field with auto-calculated value
  useEffect(() => {
    if (autoBalance !== null) form.setValue('balance', autoBalance)
  }, [autoBalance]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-calculate monthly payment for mortgages
  useEffect(() => {
    if (!isMortgage || manualPayment || !originalAmount || !annualRate || !loanTerm) return
    const payment = mortgageMonthlyPayment(
      autoBalance ?? originalAmount,
      annualRate, remainingTerm, remainingGrace, repaymentType, 1,
    )
    form.setValue('monthly_payment', Math.round(payment))
  }, [isMortgage, manualPayment, originalAmount, annualRate, loanTerm, gracePeriod, repaymentType, startDate, autoBalance]) // eslint-disable-line react-hooks/exhaustive-deps

  // Payment previews
  const previewBase = autoBalance ?? originalAmount
  const currentPayment = isMortgage && previewBase && annualRate
    ? mortgageMonthlyPayment(previewBase, annualRate, remainingTerm, remainingGrace, repaymentType, 1)
    : null
  const firstRepaymentPayment = isMortgage && previewBase && annualRate
    ? mortgageMonthlyPayment(previewBase, annualRate, remainingTerm, remainingGrace, repaymentType, remainingGrace + 1)
    : null
  const lastPayment = isMortgage && previewBase && annualRate
    ? mortgageMonthlyPayment(previewBase, annualRate, remainingTerm, remainingGrace, repaymentType, remainingTerm)
    : null

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      // For mortgages: store auto-calculated balance
      balance: canAutoCalcBalance && autoBalance !== null ? autoBalance : values.balance,
      repayment_type: isMortgage ? values.repayment_type : undefined,
      grace_period_months: isMortgage ? values.grace_period_months : undefined,
      loan_term_months: isMortgage ? values.loan_term_months : undefined,
      loan_start_date: isMortgage && values.loan_start_date ? values.loan_start_date : undefined,
      manual_payment: isMortgage ? values.manual_payment : undefined,
      original_loan_amount: isMortgage ? values.original_loan_amount : undefined,
    }
    if (editDebt) {
      updateDebt(editDebt.id, payload as Partial<Omit<Debt, 'id'>>)
    } else {
      addDebt(payload as Omit<Debt, 'id'>)
    }
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editDebt ? '부채 수정' : '부채 추가'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">

              {/* Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예) 아파트 주담대" {...field} className="bg-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Debt class */}
              <FormField control={form.control} name="debt_class" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>유형</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border">
                      {debtClasses.map((dc) => (
                        <SelectItem key={dc} value={dc}>{debtClassLabels[dc]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* ── Mortgage-specific fields ── */}
              {isMortgage && (
                <>
                  {/* Repayment type */}
                  <FormField control={form.control} name="repayment_type" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>상환 방식</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'equal_payment'}>
                        <FormControl>
                          <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          {repaymentTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="font-medium">{t.label}</span>
                              <span className="ml-2 text-muted-foreground text-xs">{t.desc}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Term + grace */}
                  <FormField control={form.control} name="loan_term_months" render={({ field }) => (
                    <FormItem>
                      <FormLabel>대출기간 (개월)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} placeholder="360" {...field} className="bg-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="grace_period_months" render={({ field }) => (
                    <FormItem>
                      <FormLabel>거치기간 (개월)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1} placeholder="0" {...field} className="bg-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Loan start date — numeric YYYY-MM-DD */}
                  <FormField control={form.control} name="loan_start_date" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>대출 시작일</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="YYYY-MM-DD"
                          maxLength={10}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(formatDateInput(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="bg-input tabular-nums"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Loan status banner */}
                  {isCompleteDate(startDate) && elapsed >= 0 && (
                    <div className={`col-span-2 rounded-lg px-3 py-2.5 text-sm ${
                      isInGrace
                        ? 'bg-orange-50 border border-orange-200 text-orange-800'
                        : 'bg-blue-50 border border-blue-200 text-blue-800'
                    }`}>
                      {isInGrace ? (
                        <p>
                          <span className="font-semibold">거치기간 중</span>
                          {' '}— 경과 {elapsed}개월,{' '}
                          거치 잔여 <span className="font-semibold">{remainingGrace}개월</span>
                        </p>
                      ) : (
                        <p>
                          <span className="font-semibold">원금 상환 중</span>
                          {' '}— 상환 {repaymentMonthsIn}개월째,{' '}
                          잔여 <span className="font-semibold">{remainingRepayment}개월</span>
                          {remainingRepayment >= 12 && ` (약 ${(remainingRepayment / 12).toFixed(1)}년)`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Original loan amount */}
                  <FormField control={form.control} name="original_loan_amount" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>최초 대출금액 (₩)</FormLabel>
                      <FormControl>
                        <CommaInput
                          value={field.value as number}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="bg-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Auto-calculated current balance */}
                  {autoBalance !== null && (
                    <div className="col-span-2 flex justify-between items-center rounded-lg bg-muted px-3 py-2 text-sm">
                      <span className="text-muted-foreground">현재 잔액 (자동계산)</span>
                      <span className="font-semibold text-red-500">{formatCurrency(autoBalance, sym)}</span>
                    </div>
                  )}

                  {/* When no start date: show manual balance input */}
                  {!canAutoCalcBalance && (
                    <FormField control={form.control} name="balance" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>현재 잔액 (₩)</FormLabel>
                        <FormControl>
                          <CommaInput
                            value={field.value as number}
                            onValueChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            className="bg-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </>
              )}

              {/* Interest rate — always shown */}
              <FormField control={form.control} name="annual_interest_rate" render={({ field }) => (
                <FormItem className={isMortgage ? '' : ''}>
                  <FormLabel>이자율 (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} className="bg-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Non-mortgage balance */}
              {!isMortgage && (
                <FormField control={form.control} name="balance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>잔액 (₩)</FormLabel>
                    <FormControl>
                      <CommaInput
                        value={field.value as number}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="bg-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Payment preview box */}
              {isMortgage && !manualPayment && currentPayment !== null && previewBase > 0 && annualRate > 0 && (
                <div className="col-span-2 rounded-lg bg-muted p-3 space-y-1.5 text-sm">
                  <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-2">납입금 예시</p>
                  {remainingGrace > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">거치기간 납입금 (이자만)</span>
                      <span className="font-semibold">{formatCurrency(currentPayment, sym)}/월</span>
                    </div>
                  )}
                  {firstRepaymentPayment !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {repaymentType === 'equal_payment' ? '월 납입금 (매달 동일)' :
                         repaymentType === 'equal_principal' ? '첫달 납입금 (이후 감소)' :
                         '첫달 납입금 (이후 증가)'}
                      </span>
                      <span className="font-semibold">{formatCurrency(firstRepaymentPayment, sym)}/월</span>
                    </div>
                  )}
                  {repaymentType !== 'equal_payment' && lastPayment !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">마지막달 납입금</span>
                      <span className="font-semibold">{formatCurrency(lastPayment, sym)}/월</span>
                    </div>
                  )}
                </div>
              )}

              {/* Manual payment toggle */}
              {isMortgage && (
                <FormField control={form.control} name="manual_payment" render={({ field }) => (
                  <FormItem className="col-span-2 flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        id="manual_payment"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#1c1c1e] cursor-pointer"
                      />
                    </FormControl>
                    <label htmlFor="manual_payment" className="text-sm text-muted-foreground cursor-pointer select-none">
                      월 납입금 직접 입력
                    </label>
                  </FormItem>
                )} />
              )}

              {/* Monthly payment: manual for non-mortgage OR when override checked */}
              {(!isMortgage || manualPayment) && (
                <FormField control={form.control} name="monthly_payment" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>월 납입금 (₩)</FormLabel>
                    <FormControl>
                      <CommaInput
                        value={field.value as number}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="bg-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Notes */}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Input placeholder="선택 사항..." {...field} className="bg-input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editDebt ? '수정 완료' : '부채 추가'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

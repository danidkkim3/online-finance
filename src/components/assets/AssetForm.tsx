'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useStore } from '@/lib/store'
import { Asset, AssetClass, TaxType } from '@/types'
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
  FormDescription,
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

const assetClasses: AssetClass[] = ['Cash', '예금', 'Stocks', 'Real Estate', 'Crypto', 'Bonds', 'Other']
const assetClassLabels: Record<AssetClass, string> = {
  Cash: '현금',
  '예금': '예금',
  Stocks: '주식',
  'Real Estate': '부동산',
  Crypto: '암호화폐',
  Bonds: '채권',
  Other: '기타',
}

const defaultRoi: Record<AssetClass, number> = {
  Cash: 0,
  '예금': 3,
  Stocks: 7,
  'Real Estate': 7,
  Crypto: 7,
  Bonds: 3,
  Other: 0,
}

const defaultTax: Record<AssetClass, { tax_type: TaxType; tax_value: number }> = {
  Cash:           { tax_type: 'pct_appreciation', tax_value: 0 },    // 비과세
  '예금':         { tax_type: 'pct_total',         tax_value: 15.4 }, // 이자소득세 15.4%
  Stocks:         { tax_type: 'pct_appreciation',  tax_value: 22 },   // 양도소득세 22%
  'Real Estate':  { tax_type: 'pct_appreciation',  tax_value: 22 },   // 양도소득세 22%
  Crypto:         { tax_type: 'pct_appreciation',  tax_value: 22 },   // 가상자산 양도세 22%
  Bonds:          { tax_type: 'pct_total',         tax_value: 15.4 }, // 이자소득세 15.4%
  Other:          { tax_type: 'pct_appreciation',  tax_value: 0 },
}

const taxTypes: { value: TaxType; label: string }[] = [
  { value: 'pct_appreciation', label: '차익 대비 % (양도소득세)' },
  { value: 'pct_total', label: '총 가치 대비 %' },
  { value: 'flat_dollar', label: '고정 금액' },
]

const schema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  asset_class: z.string(),
  current_value: z.coerce.number().min(0),
  annual_roi_pct: z.coerce.number().min(-100).max(1000),
  tax_type: z.enum(['flat_dollar', 'pct_total', 'pct_appreciation']),
  tax_value: z.coerce.number().min(0),
  cost_basis: z.coerce.number().min(0),
  monthly_contribution: z.coerce.number().min(0),
  notes: z.string(),
})

export type FormValues = z.infer<typeof schema>

interface AssetFormProps {
  open: boolean
  onClose: () => void
  editAsset?: Asset
  prefillValues?: Partial<FormValues>
}

export function AssetForm({ open, onClose, editAsset, prefillValues }: AssetFormProps) {
  const { addAsset, updateAsset } = useStore()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: editAsset
      ? {
          name: editAsset.name,
          asset_class: editAsset.asset_class,
          current_value: editAsset.current_value,
          annual_roi_pct: editAsset.annual_roi_pct,
          tax_type: editAsset.tax_type,
          tax_value: editAsset.tax_value,
          cost_basis: editAsset.cost_basis,
          monthly_contribution: editAsset.monthly_contribution,
          notes: editAsset.notes,
        }
      : {
          name: '',
          asset_class: 'Stocks',
          current_value: 0,
          annual_roi_pct: defaultRoi['Stocks'],
          tax_type: defaultTax['Stocks'].tax_type,
          tax_value: defaultTax['Stocks'].tax_value,
          cost_basis: 0,
          monthly_contribution: 0,
          notes: '',
        },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        editAsset
          ? {
              name: editAsset.name,
              asset_class: editAsset.asset_class,
              current_value: editAsset.current_value,
              annual_roi_pct: editAsset.annual_roi_pct,
              tax_type: editAsset.tax_type,
              tax_value: editAsset.tax_value,
              cost_basis: editAsset.cost_basis,
              monthly_contribution: editAsset.monthly_contribution,
              notes: editAsset.notes,
            }
          : {
              name: '',
              asset_class: 'Stocks',
              current_value: 0,
              annual_roi_pct: defaultRoi['Stocks'],
              tax_type: defaultTax['Stocks'].tax_type,
              tax_value: defaultTax['Stocks'].tax_value,
              cost_basis: 0,
              monthly_contribution: 0,
              notes: '',
              ...prefillValues,
            },
      )
    }
  }, [open, editAsset]) // eslint-disable-line react-hooks/exhaustive-deps

  const taxType = form.watch('tax_type')
  const assetClass = form.watch('asset_class')

  // Auto-fill default ROI and tax when asset class changes (new assets only)
  useEffect(() => {
    if (!editAsset && assetClass) {
      const cls = assetClass as AssetClass
      form.setValue('annual_roi_pct', defaultRoi[cls] ?? 0)
      form.setValue('tax_type', defaultTax[cls]?.tax_type ?? 'pct_appreciation')
      form.setValue('tax_value', defaultTax[cls]?.tax_value ?? 0)
    }
  }, [assetClass]) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: FormValues) {
    if (editAsset) {
      updateAsset(editAsset.id, values as Partial<Omit<Asset, 'id'>>)
    } else {
      addAsset(values as Omit<Asset, 'id'>)
    }
    form.reset()
    onClose()
  }

  const taxLabel =
    taxType === 'flat_dollar'
      ? '세금 금액 (₩)'
      : taxType === 'pct_total'
      ? '세율 (총 가치 대비 %)'
      : '세율 (차익 대비 %)'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAsset ? '자산 수정' : '자산 추가'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input placeholder="예) 삼성전자, 강남 아파트" {...field} className="bg-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>자산 유형</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-input">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {assetClasses.map((ac) => (
                          <SelectItem key={ac} value={ac}>{assetClassLabels[ac]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="annual_roi_pct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연간 수익률 (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} className="bg-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>현재 가치 (₩)</FormLabel>
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
                )}
              />

              <FormField
                control={form.control}
                name="cost_basis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>취득 원가 (₩)</FormLabel>
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
                )}
              />

              <FormField
                control={form.control}
                name="tax_type"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>세금 방식</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-input">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {taxTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{taxLabel}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} className="bg-input" />
                    </FormControl>
                    <FormDescription>
                      {taxType === 'flat_dollar' ? '연간 고정 세금' : '매도 시 적용'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthly_contribution"
                render={({ field }) => (
                  <FormItem>
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
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Input placeholder="선택 사항..." {...field} className="bg-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editAsset ? '수정 완료' : '자산 추가'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

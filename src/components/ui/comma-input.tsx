'use client'

import * as React from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

function addCommas(str: string): string {
  const [int, dec] = str.split('.')
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt
}

interface CommaInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: number
  onValueChange?: (value: number) => void
}

const CommaInput = React.forwardRef<HTMLInputElement, CommaInputProps>(
  ({ value = 0, onValueChange, onBlur, className, placeholder = '0', ...props }, ref) => {
    const [draft, setDraft] = useState<string | null>(null)

    const displayValue = draft ?? (value === 0 ? '' : addCommas(String(value)))

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/,/g, '')
      if (!/^\d*\.?\d*$/.test(raw)) return
      setDraft(raw === '' ? '' : addCommas(raw))
      onValueChange?.(raw === '' ? 0 : parseFloat(raw) || 0)
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setDraft(null)
      onBlur?.(e)
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        data-slot="input"
        value={displayValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
    )
  },
)
CommaInput.displayName = 'CommaInput'

export { CommaInput }

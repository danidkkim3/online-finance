import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, symbol = '$'): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (symbol === '₩') {
    if (abs >= 100_000_000) {
      return sign + symbol + (abs / 100_000_000).toFixed(2) + '억'
    }
    if (abs >= 10_000) {
      return sign + symbol + Math.round(abs / 10_000) + '만'
    }
    return sign + symbol + Math.round(abs).toLocaleString('ko-KR')
  }

  let formatted: string
  if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toFixed(2) + 'M'
  } else if (abs >= 1_000) {
    formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  } else {
    formatted = abs.toFixed(2)
  }
  return sign + symbol + formatted
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals)
}

export function formatPct(value: number, decimals = 2): string {
  return value.toFixed(decimals) + '%'
}

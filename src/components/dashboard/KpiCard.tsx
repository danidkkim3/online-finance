'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/info-tooltip'

interface KpiCardProps {
  label: string
  tooltip?: string
  value: string
  subValue?: string
  subValue2?: string
  subValueColor?: 'green' | 'yellow' | 'red'
  featured?: boolean
  className?: string
}

export function KpiCard({
  label,
  tooltip,
  value,
  subValue,
  subValue2,
  subValueColor,
  featured = false,
  className,
}: KpiCardProps) {
  const subValueClass =
    subValueColor === 'green' ? 'text-green-600' :
    subValueColor === 'yellow' ? 'text-yellow-600' :
    subValueColor === 'red' ? 'text-red-500' :
    'text-muted-foreground'
  if (featured) {
    return (
      <Card className={cn('bg-[#1c1c1e] border-[#1c1c1e] shadow-lg', className)}>
        <CardContent className="p-5">
          <p className="flex items-center gap-1 text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          <p className="text-3xl font-bold text-white kpi-value">{value}</p>
          {subValue && (
            <p className="text-xs text-white/40 mt-1">{subValue}</p>
          )}
          {subValue2 && (
            <p className="text-xs text-white/60 mt-0.5 font-medium">{subValue2}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-card border-border shadow-sm', className)}>
      <CardContent className="p-5">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </p>
        <p className="text-2xl font-bold text-foreground kpi-value">{value}</p>
        {subValue && (
          <p className={`text-xs mt-1 ${subValueClass}`}>{subValue}</p>
        )}
        {subValue2 && (
          <p className="text-xs text-foreground mt-0.5 font-medium">{subValue2}</p>
        )}
      </CardContent>
    </Card>
  )
}

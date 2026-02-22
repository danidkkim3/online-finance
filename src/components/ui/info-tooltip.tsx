'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  text: string
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg bg-popover border border-border shadow-lg p-3 text-xs text-muted-foreground z-50 leading-relaxed block">
          {text}
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border block" />
        </span>
      )}
    </span>
  )
}

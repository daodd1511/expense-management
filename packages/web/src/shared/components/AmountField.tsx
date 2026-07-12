import type { RefObject } from 'react'
import { formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

const MAX_DIGITS = 12
const TONE_CLASS = { income: 'text-income', expense: 'text-expense', neutral: 'text-foreground' } as const

/** Large centered VND amount entry shared by every form that captures a money amount. */
export function AmountField({
  label,
  value,
  onChange,
  tone = 'neutral',
  inputRef,
  maxDigits = MAX_DIGITS,
}: {
  label: string
  value: string
  onChange: (digitsOnly: string) => void
  tone?: 'income' | 'expense' | 'neutral'
  inputRef?: RefObject<HTMLInputElement | null>
  maxDigits?: number
}) {
  const toneClass = TONE_CLASS[tone]

  return (
    <div className="flex flex-col items-center gap-1 px-4 py-5 sm:px-5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value ? formatVND(Number(value), false) : ''}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '')
          if (digits.length <= maxDigits) onChange(digits)
        }}
        placeholder="0"
        className={cn(
          'w-full bg-transparent text-center text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40',
          toneClass,
        )}
      />
    </div>
  )
}

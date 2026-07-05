import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/core/i18n'
import { shiftMonthIso } from '@/shared/lib/date'
import { monthLabel } from '@/shared/lib/format'
import { parseLocalDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'

export function TransactionsMonthSwitcher({
  month,
  onChange,
  className,
}: {
  month: string
  onChange: (month: string) => void
  className?: string
}) {
  const { lang, t } = useLang()

  const handlePrevious = () => {
    onChange(shiftMonthIso(month, -1))
  }

  const handleNext = () => {
    onChange(shiftMonthIso(month, 1))
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5', className)}>
      <button
        type="button"
        onClick={handlePrevious}
        aria-label={t('tx.monthPrev')}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div className="min-w-36 text-center">
        <p className="text-xs text-muted-foreground">{t('tx.monthLabel')}</p>
        <p className="text-sm font-semibold">
          {monthLabel(parseLocalDate(`${month}-01`), lang)}
        </p>
      </div>
      <button
        type="button"
        onClick={handleNext}
        aria-label={t('tx.monthNext')}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}

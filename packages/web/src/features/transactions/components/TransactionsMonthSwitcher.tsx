import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { DATE_LOCALE, useLang } from '@/core/i18n'
import {
  Popover,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { parseLocalDate, shiftMonthIso } from '@/shared/lib/date'
import { monthLabel } from '@/shared/lib/format'
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
  const selectedDate = parseLocalDate(`${month}-01`)
  const selectedYear = selectedDate.getFullYear()
  const selectedMonth = selectedDate.getMonth()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(selectedYear)
  const monthNames = DATE_LOCALE[lang].months

  const handlePrevious = () => {
    onChange(shiftMonthIso(month, -1))
  }

  const handleNext = () => {
    onChange(shiftMonthIso(month, 1))
  }

  const handlePickerOpenChange = (open: boolean) => {
    setIsPickerOpen(open)
    if (open) setPickerYear(selectedYear)
  }

  const handleMonthSelect = (monthIndex: number) => {
    onChange(`${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`)
    setIsPickerOpen(false)
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
      <Popover open={isPickerOpen} onOpenChange={handlePickerOpenChange}>
        <PopoverTrigger
          type="button"
          aria-label={t('tx.monthLabel')}
          className="min-w-36 rounded-lg px-2 text-center outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <span className="block text-xs text-muted-foreground">{t('tx.monthLabel')}</span>
          <span className="block text-sm font-semibold">{monthLabel(selectedDate, lang)}</span>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverPositioner align="center">
            <PopoverPopup className="w-72 p-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPickerYear((year) => year - 1)}
                  aria-label={t('tx.yearPrev')}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-sm font-semibold">{pickerYear}</span>
                <button
                  type="button"
                  onClick={() => setPickerYear((year) => year + 1)}
                  aria-label={t('tx.yearNext')}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2" role="listbox" aria-label={t('tx.monthLabel')}>
                {monthNames.map((name, index) => {
                  const isSelected = pickerYear === selectedYear && index === selectedMonth
                  return (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={`${name} ${pickerYear}`}
                      onClick={() => handleMonthSelect(index)}
                      className={cn(
                        'rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      {lang === 'en' ? name.slice(0, 3) : name.replace('Tháng ', 'T')}
                    </button>
                  )
                })}
              </div>
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>
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

'use client'

import { format } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  className?: string
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const { lang, t } = useLang()
  const locale = lang === 'vi' ? vi : enUS
  const selected = value ? new Date(value) : undefined

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    onChange(date.toISOString().slice(0, 10))
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none transition-colors',
          'hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
          !selected && 'text-muted-foreground',
          className,
        )}
      >
        <span className="truncate">
          {selected
            ? format(selected, lang === 'vi' ? 'dd/MM/yyyy' : 'MMM d, yyyy', { locale })
            : t('form.date')}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner align="start">
          <PopoverPopup>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected}
              locale={locale}
            />
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  )
}

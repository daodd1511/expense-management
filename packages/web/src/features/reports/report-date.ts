import { monthLabel } from '@/shared/lib/format'
import { parseLocalDate, todayLocalMonthIso } from '@/shared/lib/date'
import type { Lang } from '@/core/types'

export function monthRangeFromMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)
  const start = new Date(year, monthIndex - 1, 1)
  const end = new Date(year, monthIndex, 0)

  return {
    from: localDateIso(start),
    to: localDateIso(end),
  }
}

export function currentReportMonth(searchMonth: string | undefined) {
  return searchMonth && /^\d{4}-\d{2}$/.test(searchMonth) ? searchMonth : todayLocalMonthIso()
}

export function formatReportMonth(month: string, lang: Lang) {
  return monthLabel(parseLocalDate(`${month}-01`), lang)
}

function localDateIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

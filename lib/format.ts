import type { TxType } from './types'

// VND: dot thousands, trailing ₫  -> 100.000 ₫
export function formatVND(amount: number, withSymbol = true): string {
  const n = Math.round(Math.abs(amount))
  const grouped = n.toLocaleString('vi-VN')
  return withSymbol ? `${grouped} ₫` : grouped
}

// signed amount with +/- for income/expense, ± for transfer neutral
export function formatSigned(amount: number, type: TxType): string {
  const base = formatVND(amount)
  if (type === 'income') return `+${base}`
  if (type === 'expense') return `−${base}`
  return base
}

export function amountColorClass(type: TxType): string {
  if (type === 'income') return 'text-income'
  if (type === 'expense') return 'text-expense'
  return 'text-transfer'
}

const VI_MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

const VI_WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

export function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (sameDay(d, today)) return 'Hôm nay'
  if (sameDay(d, yest)) return 'Hôm qua'
  return `${VI_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${VI_MONTHS[d.getMonth()].toLowerCase()}`
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function monthLabel(date: Date): string {
  return `${VI_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

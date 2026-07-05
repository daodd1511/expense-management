/**
 * Date-only ('YYYY-MM-DD') helpers. `tx_date` / `nextDueDate` carry no time or timezone
 * component, so `new Date(iso)` (which parses as UTC midnight) must never be used on them —
 * comparing that against a local `new Date()` silently drifts a day near the UTC boundary.
 * These parse and compare as plain local calendar dates instead.
 */

/** Parses a 'YYYY-MM-DD' string as a local calendar date (midnight, local time). */
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Today's date as a local 'YYYY-MM-DD' string. */
export function todayLocalIso(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's month as a local 'YYYY-MM' string. */
export function todayLocalMonthIso(date: Date = new Date()): string {
  return todayLocalIso(date).slice(0, 7)
}

/** Shifts a 'YYYY-MM' month string by `delta` months and returns the same format. */
export function shiftMonthIso(monthIso: string, delta: number): string {
  const [year, month] = monthIso.split('-').map(Number)
  const next = new Date(year, month - 1 + delta, 1)
  const nextYear = next.getFullYear()
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0')
  return `${nextYear}-${nextMonth}`
}

/** Whether `iso` falls in the same local calendar month as `ref` (defaults to today). */
export function isSameLocalMonth(iso: string, ref: Date = new Date()): boolean {
  const d = parseLocalDate(iso)
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

/** Whole-day difference (`a - b`) between two 'YYYY-MM-DD' strings, as local calendar dates. */
export function diffDays(aIso: string, bIso: string): number {
  const a = parseLocalDate(aIso)
  const b = parseLocalDate(bIso)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((a.getTime() - b.getTime()) / msPerDay)
}

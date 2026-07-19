import type { SpendingAnalysisPreset } from "@wallet/shared";
import { shiftMonthIso, todayLocalIso, todayLocalMonthIso } from "@/shared/lib/date";

export type ReportRangePreset = SpendingAnalysisPreset;
export type ReportRange = { from: string; to: string };

/**
 * Resolves a preset to a concrete {from, to} range as of "today". Mirrors the server's
 * comparison-range rules in intent (packages/shared/src/finance.ts ->
 * computeSpendingComparisonRange) but computes the *selected* range, not the comparison
 * range: "this-month" is elapsed-to-date (Jan 1 -> today), not the whole month, while
 * "last-N-months" are N whole calendar months not including the current (incomplete) one.
 */
export function resolveReportRange(preset: ReportRangePreset, custom?: ReportRange): ReportRange {
  const currentMonth = todayLocalMonthIso();

  switch (preset) {
    case "this-month":
      return { from: monthRangeFromMonth(currentMonth).from, to: todayLocalIso() };
    case "previous-month":
      return monthRangeFromMonth(shiftMonthIso(currentMonth, -1));
    case "last-3-months":
      return lastCompleteMonthsRange(3);
    case "last-6-months":
      return lastCompleteMonthsRange(6);
    case "last-12-months":
      return lastCompleteMonthsRange(12);
    case "custom":
      return custom ?? { from: monthRangeFromMonth(currentMonth).from, to: todayLocalIso() };
  }
}

/** The `count` whole calendar months immediately before the current (incomplete) month. */
function lastCompleteMonthsRange(count: number): ReportRange {
  const currentMonth = todayLocalMonthIso();
  const lastCompleteMonth = shiftMonthIso(currentMonth, -1);
  const firstMonth = shiftMonthIso(currentMonth, -count);
  return {
    from: monthRangeFromMonth(firstMonth).from,
    to: monthRangeFromMonth(lastCompleteMonth).to,
  };
}

export function monthRangeFromMonth(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);

  return {
    from: localDateIso(start),
    to: localDateIso(end),
  };
}

function localDateIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

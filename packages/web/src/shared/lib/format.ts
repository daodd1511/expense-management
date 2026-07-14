import { DATE_LOCALE } from "@/core/i18n";
import { parseLocalDate } from "@/shared/lib/date";
import type { Lang, TxType } from "@/core/types";

// VND: dot thousands, trailing ₫  -> 100.000 ₫
export function formatVND(amount: number, withSymbol = true): string {
  const n = Math.round(Math.abs(amount));
  const grouped = n.toLocaleString("vi-VN");
  return withSymbol ? `${grouped} ₫` : grouped;
}

/** Compacts only values that would overflow constrained dashboard cards. */
export function formatCompactVND(amount: number, lang: Lang = "vi"): string {
  const exact = formatVND(amount);
  if (exact.length <= 13) return exact;

  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const compact = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(Math.abs(amount)));
  return `${compact} ₫`;
}

// signed amount with +/- for income/expense, ± for transfer neutral
export function formatSigned(amount: number, type: TxType): string {
  const base = formatVND(amount);
  if (type === "income") return `+${base}`;
  if (type === "expense") return `−${base}`;
  return base;
}

export function amountColorClass(type: TxType): string {
  if (type === "income") return "text-income";
  if (type === "expense") return "text-expense";
  return "text-transfer";
}

export function formatDayLabel(
  iso: string,
  lang: Lang = "vi",
  todayLabel = "Hôm nay",
  yesterdayLabel = "Hôm qua",
): string {
  const d = parseLocalDate(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
  if (sameDay(d, today)) return todayLabel;
  if (sameDay(d, yest)) return yesterdayLabel;
  const { months, weekdays } = DATE_LOCALE[lang];
  if (lang === "en") {
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()].toLowerCase()}`;
}

export function formatShortDate(iso: string): string {
  const d = parseLocalDate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const d = parseLocalDate(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function monthLabel(date: Date, lang: Lang = "vi"): string {
  const { months } = DATE_LOCALE[lang];
  if (lang === "en") return `${months[date.getMonth()]} ${date.getFullYear()}`;
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

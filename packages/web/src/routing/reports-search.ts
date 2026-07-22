import { z } from "zod";
import { isoDateSchema, monthFilterSchema, spendingAnalysisPresetSchema } from "@wallet/shared";
import { monthRangeFromMonth, type ReportRangePreset } from "@/features/reports/report-date";

const rawReportsSearchSchema = z.object({
  preset: spendingAnalysisPresetSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  month: monthFilterSchema.optional(),
});

export type ReportsSearch = {
  preset?: ReportRangePreset;
  from?: string;
  to?: string;
};

/** Validates the raw query string and normalizes a legacy `month=YYYY-MM` link into the
 * equivalent range, so old bookmarks/shares keep resolving to the same whole month. Never
 * exposes `month` downstream — every consumer sees the {preset, from, to} shape only. */
export function validateReportsSearch(search: Record<string, unknown>): ReportsSearch {
  const parsed = rawReportsSearchSchema.parse(search);

  if (parsed.preset || parsed.from || parsed.to) {
    return { preset: parsed.preset, from: parsed.from, to: parsed.to };
  }

  if (parsed.month) {
    const range = monthRangeFromMonth(parsed.month);
    return { preset: "custom", from: range.from, to: range.to };
  }

  return {};
}

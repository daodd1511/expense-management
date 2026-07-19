import type { TranslationKey } from "@/core/i18n";

export const REPORT_TYPE_IDS = [
  "income-expense",
  "financial-position",
  "spending-analysis",
] as const;

export type ReportTypeId = (typeof REPORT_TYPE_IDS)[number];

export type ReportTypeConfig = {
  id: ReportTypeId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
};

export const REPORT_TYPES: Record<ReportTypeId, ReportTypeConfig> = {
  "income-expense": {
    id: "income-expense",
    labelKey: "reports.typeIncomeExpense",
    descriptionKey: "reports.typeIncomeExpenseDesc",
  },
  "financial-position": {
    id: "financial-position",
    labelKey: "reports.typeFinancialPosition",
    descriptionKey: "reports.typeFinancialPositionDesc",
  },
  "spending-analysis": {
    id: "spending-analysis",
    labelKey: "reports.typeSpendingAnalysis",
    descriptionKey: "reports.typeSpendingAnalysisDesc",
  },
} as const;

export const DEFAULT_REPORT_TYPE_ID: ReportTypeId = "income-expense";

import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_TYPE_ID, REPORT_TYPE_IDS, REPORT_TYPES } from "./report-types";

describe("report-types", () => {
  it("registers spending-analysis alongside the existing report types", () => {
    expect(REPORT_TYPE_IDS).toEqual(["income-expense", "financial-position", "spending-analysis"]);
    expect(REPORT_TYPES["spending-analysis"]).toEqual({
      id: "spending-analysis",
      labelKey: "reports.typeSpendingAnalysis",
      descriptionKey: "reports.typeSpendingAnalysisDesc",
    });
  });

  it("keeps income-expense as the default report type", () => {
    expect(DEFAULT_REPORT_TYPE_ID).toBe("income-expense");
  });
});

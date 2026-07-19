import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { monthRangeFromMonth, resolveReportRange } from "./report-date";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 19, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveReportRange", () => {
  it("this-month runs from the 1st through today", () => {
    expect(resolveReportRange("this-month")).toEqual({ from: "2026-07-01", to: "2026-07-19" });
  });

  it("previous-month is the whole preceding calendar month", () => {
    expect(resolveReportRange("previous-month")).toEqual({ from: "2026-06-01", to: "2026-06-30" });
  });

  it("last-3-months excludes the current (incomplete) month", () => {
    expect(resolveReportRange("last-3-months")).toEqual({ from: "2026-04-01", to: "2026-06-30" });
  });

  it("last-12-months spans a year boundary", () => {
    expect(resolveReportRange("last-12-months")).toEqual({ from: "2025-07-01", to: "2026-06-30" });
  });

  it("custom passes through the given range", () => {
    expect(resolveReportRange("custom", { from: "2026-05-10", to: "2026-05-20" })).toEqual({
      from: "2026-05-10",
      to: "2026-05-20",
    });
  });

  it("custom without a given range falls back to this-month's shape", () => {
    expect(resolveReportRange("custom")).toEqual({ from: "2026-07-01", to: "2026-07-19" });
  });
});

describe("monthRangeFromMonth", () => {
  it("resolves first/last day of a leap-year February", () => {
    expect(monthRangeFromMonth("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

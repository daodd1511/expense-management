import { describe, expect, it } from "vitest";
import { diffDays, isSameLocalMonth, parseLocalDate, todayLocalIso } from "./date";

describe("parseLocalDate", () => {
  it("parses a date-only string as local midnight, not UTC", () => {
    const d = parseLocalDate("2026-07-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });

  it("does not shift across a month boundary", () => {
    const d = parseLocalDate("2026-01-01");
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

describe("todayLocalIso", () => {
  it("formats a given date as local YYYY-MM-DD", () => {
    expect(todayLocalIso(new Date(2026, 6, 1))).toBe("2026-07-01");
  });

  it("zero-pads month and day", () => {
    expect(todayLocalIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("defaults to the current date when called with no argument", () => {
    const iso = todayLocalIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isSameLocalMonth", () => {
  it("is true for a date in the same local month as ref", () => {
    expect(isSameLocalMonth("2026-07-01", new Date(2026, 6, 15))).toBe(true);
  });

  it("is false for a date in a different month", () => {
    expect(isSameLocalMonth("2026-06-30", new Date(2026, 6, 1))).toBe(false);
  });

  it("is false for the same day-of-month in a different year", () => {
    expect(isSameLocalMonth("2025-07-01", new Date(2026, 6, 1))).toBe(false);
  });
});

describe("diffDays", () => {
  it("is 0 for the same date", () => {
    expect(diffDays("2026-07-01", "2026-07-01")).toBe(0);
  });

  it("is positive when a is after b", () => {
    expect(diffDays("2026-07-05", "2026-07-01")).toBe(4);
  });

  it("is negative when a is before b", () => {
    expect(diffDays("2026-07-01", "2026-07-05")).toBe(-4);
  });

  it("crosses a month boundary correctly", () => {
    expect(diffDays("2026-08-01", "2026-07-31")).toBe(1);
  });

  it("crosses a year boundary correctly", () => {
    expect(diffDays("2027-01-01", "2026-12-31")).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { validateReportsSearch } from "./reports-search";

describe("validateReportsSearch", () => {
  it("passes through an explicit preset/from/to search", () => {
    expect(validateReportsSearch({ preset: "custom", from: "2026-07-01", to: "2026-07-19" })).toEqual({
      preset: "custom",
      from: "2026-07-01",
      to: "2026-07-19",
    });
  });

  it("normalizes a legacy month search into the equivalent whole-month range", () => {
    expect(validateReportsSearch({ month: "2026-07" })).toEqual({
      preset: "custom",
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("prefers an explicit range over a legacy month if both are somehow present", () => {
    expect(
      validateReportsSearch({ month: "2026-06", preset: "this-month", from: "2026-07-01", to: "2026-07-19" }),
    ).toEqual({ preset: "this-month", from: "2026-07-01", to: "2026-07-19" });
  });

  it("returns an empty object for a bare search with no range info", () => {
    expect(validateReportsSearch({})).toEqual({});
  });

  it("rejects an unknown preset", () => {
    expect(() => validateReportsSearch({ preset: "not-a-preset" })).toThrow();
  });
});

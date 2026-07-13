import { describe, expect, it } from "vitest";
import { isoDateSchema } from "./common.dto";

describe("isoDateSchema", () => {
  it("accepts a date-only ISO string", () => {
    expect(isoDateSchema.parse("2026-07-01")).toBe("2026-07-01");
  });

  it("normalizes an ISO timestamp down to YYYY-MM-DD", () => {
    expect(isoDateSchema.parse("2026-07-01T12:00:00.000Z")).toBe("2026-07-01");
  });

  it("rejects a non-ISO date string", () => {
    const result = isoDateSchema.safeParse("2026/07/01");
    expect(result.success).toBe(false);
  });
});

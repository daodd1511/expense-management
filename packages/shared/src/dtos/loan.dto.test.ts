import { describe, expect, it } from "vitest";
import {
  closeLoanSchema,
  disbursedLoanCreateSchema,
  loanMetadataPatchSchema,
  loanRepaymentCreateSchema,
  openingLoanCreateSchema,
  personCreateSchema,
  personPatchSchema,
} from "./loan.dto";

function tomorrowIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("personCreateSchema", () => {
  it("requires a non-empty name", () => {
    expect(personCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts an optional note", () => {
    expect(personCreateSchema.parse({ name: "Alex", note: "old friend" }).note).toBe("old friend");
  });
});

describe("personPatchSchema", () => {
  it("requires at least one field", () => {
    expect(personPatchSchema.safeParse({}).success).toBe(false);
  });

  it("accepts null to clear the note", () => {
    expect(personPatchSchema.parse({ note: null }).note).toBeNull();
  });
});

describe("disbursedLoanCreateSchema", () => {
  function baseInput(overrides: Record<string, unknown> = {}) {
    return {
      personId: "person-1",
      direction: "lending",
      amount: 100_000,
      accountId: "acc-1",
      date: "2026-07-01",
      ...overrides,
    };
  }

  it("accepts a valid disbursement payload", () => {
    expect(disbursedLoanCreateSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("rejects a non-positive amount", () => {
    expect(disbursedLoanCreateSchema.safeParse(baseInput({ amount: 0 })).success).toBe(false);
  });

  it("rejects a future event date", () => {
    expect(
      disbursedLoanCreateSchema.safeParse(baseInput({ date: tomorrowIsoDate() })).success,
    ).toBe(false);
  });

  it("rejects an invalid direction", () => {
    expect(disbursedLoanCreateSchema.safeParse(baseInput({ direction: "sideways" })).success).toBe(
      false,
    );
  });
});

describe("openingLoanCreateSchema", () => {
  it("accepts a valid opening-loan payload without an account", () => {
    const result = openingLoanCreateSchema.safeParse({
      personId: "person-1",
      direction: "borrowing",
      amount: 50_000,
      balanceAsOf: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive amount", () => {
    const result = openingLoanCreateSchema.safeParse({
      personId: "person-1",
      direction: "borrowing",
      amount: -1,
      balanceAsOf: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("loanMetadataPatchSchema", () => {
  it("requires at least one field", () => {
    expect(loanMetadataPatchSchema.safeParse({}).success).toBe(false);
  });

  it("accepts null to clear the due date", () => {
    expect(loanMetadataPatchSchema.parse({ dueDate: null }).dueDate).toBeNull();
  });
});

describe("loanRepaymentCreateSchema", () => {
  it("rejects a zero amount", () => {
    const result = loanRepaymentCreateSchema.safeParse({
      amount: 0,
      accountId: "acc-1",
      date: "2026-07-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a future date", () => {
    const result = loanRepaymentCreateSchema.safeParse({
      amount: 1000,
      accountId: "acc-1",
      date: tomorrowIsoDate(),
    });
    expect(result.success).toBe(false);
  });
});

describe("closeLoanSchema", () => {
  it("accepts write_off and forgiveness kinds", () => {
    expect(closeLoanSchema.safeParse({ kind: "write_off", date: "2026-07-01" }).success).toBe(true);
    expect(closeLoanSchema.safeParse({ kind: "forgiveness", date: "2026-07-01" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid kind", () => {
    expect(closeLoanSchema.safeParse({ kind: "cancelled", date: "2026-07-01" }).success).toBe(
      false,
    );
  });
});

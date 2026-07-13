import { describe, expect, it } from "vitest";
import { transactionCreateSchema, transactionPatchSchema } from "./transaction.dto";

function tomorrowIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("transactionCreateSchema", () => {
  it("normalizes an ISO timestamp date in create payloads", () => {
    const result = transactionCreateSchema.parse({
      type: "expense",
      amount: 1213,
      categoryId: "cat-1",
      accountId: "acc-1",
      merchant: "AAA",
      date: "2026-07-01T12:00:00.000Z",
      receipt: null,
    });

    expect(result.date).toBe("2026-07-01");
  });

  it("rejects future transaction dates", () => {
    const result = transactionCreateSchema.safeParse({
      type: "expense",
      amount: 1213,
      categoryId: "cat-1",
      accountId: "acc-1",
      merchant: "AAA",
      date: tomorrowIsoDate(),
      receipt: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Narrows the safeParse union; expect(result.success).toBe(false) above already guarantees this branch runs.
      // oxlint-disable-next-line vitest/no-conditional-expect
      expect(result.error.issues[0]?.message).toBe("Transaction date cannot be in the future");
    }
  });

  it("accepts local HH:MM transaction time", () => {
    const result = transactionCreateSchema.parse({
      type: "expense",
      amount: 1213,
      categoryId: "cat-1",
      accountId: "acc-1",
      merchant: "AAA",
      date: "2026-07-01",
      time: "09:45",
      receipt: null,
    });

    expect(result.time).toBe("09:45");
  });

  it("rejects non-local transaction time values", () => {
    const result = transactionCreateSchema.safeParse({
      type: "expense",
      amount: 1213,
      categoryId: "cat-1",
      accountId: "acc-1",
      merchant: "AAA",
      date: "2026-07-01",
      time: "09:45:30",
      receipt: null,
    });

    expect(result.success).toBe(false);
  });

  it("rejects out-of-range transaction time values", () => {
    const result = transactionCreateSchema.safeParse({
      type: "expense",
      amount: 1213,
      categoryId: "cat-1",
      accountId: "acc-1",
      merchant: "AAA",
      date: "2026-07-01",
      time: "24:00",
      receipt: null,
    });

    expect(result.success).toBe(false);
  });

  it("rejects response-only balanceAfter in create payloads", () => {
    const result = transactionCreateSchema.safeParse({
      type: "expense",
      amount: 1213,
      categoryId: "cat-1",
      accountId: "acc-1",
      merchant: "AAA",
      date: "2026-07-01",
      balanceAfter: 999,
      receipt: null,
    });

    expect(result.success).toBe(false);
  });

  it("accepts an optional nonnegative transfer fee", () => {
    expect(
      transactionCreateSchema.parse({
        type: "transfer",
        amount: 100,
        categoryId: null,
        accountId: "acc-1",
        toAccountId: "acc-2",
        merchant: "Transfer",
        date: "2026-07-01",
        receipt: null,
        fee: 10,
      }).fee,
    ).toBe(10);
  });
});

describe("transactionPatchSchema", () => {
  it("accepts a zero fee to remove a linked fee expense", () => {
    expect(transactionPatchSchema.parse({ fee: 0 })).toEqual({ fee: 0 });
  });
  it("rejects response-only balanceAfter in patch payloads", () => {
    const result = transactionPatchSchema.safeParse({
      balanceAfter: 999,
    });

    expect(result.success).toBe(false);
  });
});

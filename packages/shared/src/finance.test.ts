import { describe, expect, it } from "vitest";
import {
  computeBalance,
  computeBalanceTrend,
  computeLoanOriginAmount,
  computeLoanOutstandingBalance,
  computeLoanState,
  computeLoanStatus,
  computeRunningBalances,
} from "./finance";
import type { Loan, LoanEvent, Transaction } from "./models";

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    type: "expense",
    amount: 100,
    categoryId: null,
    accountId: "acc-1",
    merchant: "Merchant",
    date: "2026-07-05",
    ...overrides,
  };
}

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    personId: "person-1",
    direction: "lending",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<LoanEvent> = {}): LoanEvent {
  return {
    id: "event-1",
    loanId: "loan-1",
    kind: "disbursement",
    amount: 100_000,
    date: "2026-07-01",
    ...overrides,
  };
}

describe("computeBalance", () => {
  it("starts from the opening balance", () => {
    expect(computeBalance("acc-1", [], 1000)).toBe(1000);
  });

  it("adds income and subtracts expense for the matching account", () => {
    const balance = computeBalance(
      "acc-1",
      [
        makeTx({ type: "income", amount: 500, accountId: "acc-1" }),
        makeTx({ type: "expense", amount: 200, accountId: "acc-1" }),
      ],
      1000,
    );
    expect(balance).toBe(1300);
  });

  it("ignores transactions on other accounts", () => {
    expect(
      computeBalance("acc-1", [makeTx({ type: "income", amount: 500, accountId: "acc-2" })], 1000),
    ).toBe(1000);
  });

  it("handles transfer in and out for the matching account", () => {
    const balance = computeBalance(
      "acc-1",
      [
        makeTx({ type: "transfer", amount: 100, accountId: "acc-1", toAccountId: "acc-2" }),
        makeTx({ type: "transfer", amount: 50, accountId: "acc-2", toAccountId: "acc-1" }),
      ],
      1000,
    );
    expect(balance).toBe(1000 - 100 + 50);
  });
});

describe("computeRunningBalances", () => {
  it("tracks account-specific balanceAfter values in ledger order", () => {
    const balances = computeRunningBalances(
      [
        makeTx({ id: "tx-1", type: "income", amount: 500, accountId: "cash" }),
        makeTx({ id: "tx-2", type: "expense", amount: 200, accountId: "cash" }),
        makeTx({ id: "tx-3", type: "income", amount: 100, accountId: "bank" }),
      ],
      { cash: 1000, bank: 50 },
    );

    expect(balances.map((tx) => ({ id: tx.id, balanceAfter: tx.balanceAfter }))).toEqual([
      { id: "tx-1", balanceAfter: 1500 },
      { id: "tx-2", balanceAfter: 1300 },
      { id: "tx-3", balanceAfter: 150 },
    ]);
  });

  it("uses input order for same-day transactions so callers can control time ordering", () => {
    const balances = computeRunningBalances(
      [
        makeTx({ id: "late", type: "expense", amount: 400, accountId: "cash", time: "18:00" }),
        makeTx({ id: "early", type: "income", amount: 100, accountId: "cash", time: "08:00" }),
      ],
      { cash: 1000 },
    );

    expect(balances.map((tx) => ({ id: tx.id, balanceAfter: tx.balanceAfter }))).toEqual([
      { id: "late", balanceAfter: 600 },
      { id: "early", balanceAfter: 700 },
    ]);
  });

  it("exposes post-transfer balances for both source and destination accounts", () => {
    const balances = computeRunningBalances(
      [
        makeTx({
          id: "transfer",
          type: "transfer",
          amount: 250,
          accountId: "cash",
          toAccountId: "bank",
        }),
        makeTx({ id: "bank-expense", type: "expense", amount: 50, accountId: "bank" }),
      ],
      { cash: 1000, bank: 200 },
    );

    expect(
      balances.map((tx) => ({
        id: tx.id,
        balanceAfter: tx.balanceAfter,
        toAccountBalanceAfter: tx.toAccountBalanceAfter,
      })),
    ).toEqual([
      { id: "transfer", balanceAfter: 750, toAccountBalanceAfter: 450 },
      { id: "bank-expense", balanceAfter: 400, toAccountBalanceAfter: undefined },
    ]);
  });
});

describe("computeBalanceTrend", () => {
  it("zero-fills months with no activity across the full window", () => {
    const points = computeBalanceTrend([], 1000, "2026-07", 6);
    expect(points).toEqual([
      { month: "2026-02", balance: 1000 },
      { month: "2026-03", balance: 1000 },
      { month: "2026-04", balance: 1000 },
      { month: "2026-05", balance: 1000 },
      { month: "2026-06", balance: 1000 },
      { month: "2026-07", balance: 1000 },
    ]);
  });

  it("accumulates income/expense month over month within the window", () => {
    const points = computeBalanceTrend(
      [
        makeTx({ type: "income", amount: 500, date: "2026-06-10" }),
        makeTx({ type: "expense", amount: 200, date: "2026-07-01" }),
      ],
      1000,
      "2026-07",
      3,
    );
    expect(points).toEqual([
      { month: "2026-05", balance: 1000 },
      { month: "2026-06", balance: 1500 },
      { month: "2026-07", balance: 1300 },
    ]);
  });

  it("folds activity before the window into the starting point instead of dropping it", () => {
    const points = computeBalanceTrend(
      [makeTx({ type: "income", amount: 5000, date: "2020-01-15" })],
      1000,
      "2026-07",
      3,
    );
    expect(points[0]).toEqual({ month: "2026-05", balance: 6000 });
    expect(points[2]).toEqual({ month: "2026-07", balance: 6000 });
  });

  it("excludes transfers from the net worth figure", () => {
    const points = computeBalanceTrend(
      [makeTx({ type: "transfer", amount: 999, date: "2026-07-01", toAccountId: "acc-2" })],
      1000,
      "2026-07",
      1,
    );
    expect(points).toEqual([{ month: "2026-07", balance: 1000 }]);
  });

  it("produces exactly monthsBack points regardless of how many months have data", () => {
    const manyMonths: Transaction[] = [];
    for (let i = 0; i < 20; i++) {
      const month = String(1 + (i % 12)).padStart(2, "0");
      manyMonths.push(
        makeTx({ type: "income", amount: 10, date: `202${i < 12 ? 4 : 5}-${month}-01` }),
      );
    }
    const points = computeBalanceTrend(manyMonths, 0, "2026-07", 6);
    expect(points).toHaveLength(6);
  });
});

describe("computeLoanOriginAmount", () => {
  it("reads the disbursement event's amount", () => {
    expect(computeLoanOriginAmount([makeEvent({ kind: "disbursement", amount: 100_000 })])).toBe(
      100_000,
    );
  });

  it("reads the opening event's amount when there's no disbursement", () => {
    expect(computeLoanOriginAmount([makeEvent({ kind: "opening", amount: 50_000 })])).toBe(50_000);
  });

  it("returns 0 when no origin event exists", () => {
    expect(computeLoanOriginAmount([])).toBe(0);
  });
});

describe("computeLoanOutstandingBalance", () => {
  it("is the origin amount when there are no repayments", () => {
    expect(
      computeLoanOutstandingBalance([makeEvent({ kind: "disbursement", amount: 100_000 })]),
    ).toBe(100_000);
  });

  it("subtracts repayments from the origin amount", () => {
    const events = [
      makeEvent({ kind: "disbursement", amount: 100_000 }),
      makeEvent({ id: "e2", kind: "repayment", amount: 30_000 }),
      makeEvent({ id: "e3", kind: "repayment", amount: 20_000 }),
    ];
    expect(computeLoanOutstandingBalance(events)).toBe(50_000);
  });

  it("is 0 once a write-off closes the loan, regardless of the closing event's own amount", () => {
    const events = [
      makeEvent({ kind: "disbursement", amount: 100_000 }),
      makeEvent({ id: "e2", kind: "repayment", amount: 30_000 }),
      makeEvent({ id: "e3", kind: "write_off", amount: 70_000 }),
    ];
    expect(computeLoanOutstandingBalance(events)).toBe(0);
  });

  it("is 0 once forgiveness closes the loan", () => {
    const events = [
      makeEvent({ kind: "opening", amount: 20_000 }),
      makeEvent({ id: "e2", kind: "forgiveness", amount: 20_000 }),
    ];
    expect(computeLoanOutstandingBalance(events)).toBe(0);
  });
});

describe("computeLoanStatus", () => {
  it("is written-off when a write_off event exists", () => {
    const events = [
      makeEvent({ kind: "disbursement", amount: 100_000 }),
      makeEvent({ id: "e2", kind: "write_off", amount: 100_000 }),
    ];
    expect(computeLoanStatus(makeLoan({ direction: "lending" }), events, "2026-07-13")).toBe(
      "written-off",
    );
  });

  it("is forgiven when a forgiveness event exists", () => {
    const events = [
      makeEvent({ kind: "opening", amount: 100_000 }),
      makeEvent({ id: "e2", kind: "forgiveness", amount: 100_000 }),
    ];
    expect(computeLoanStatus(makeLoan({ direction: "borrowing" }), events, "2026-07-13")).toBe(
      "forgiven",
    );
  });

  it("is repaid once outstanding balance reaches 0 through repayments", () => {
    const events = [
      makeEvent({ kind: "disbursement", amount: 100_000 }),
      makeEvent({ id: "e2", kind: "repayment", amount: 100_000 }),
    ];
    expect(computeLoanStatus(makeLoan(), events, "2026-07-13")).toBe("repaid");
  });

  it("is open when there's no due date", () => {
    const events = [makeEvent({ kind: "disbursement", amount: 100_000 })];
    expect(computeLoanStatus(makeLoan({ dueDate: undefined }), events, "2026-07-13")).toBe("open");
  });

  it("is open when the due date is more than 7 days out", () => {
    const events = [makeEvent({ kind: "disbursement", amount: 100_000 })];
    const loan = makeLoan({ dueDate: "2026-07-21" });
    expect(computeLoanStatus(loan, events, "2026-07-13")).toBe("open");
  });

  it("is due-soon within the 7-day window, inclusive of the boundary", () => {
    const events = [makeEvent({ kind: "disbursement", amount: 100_000 })];
    const loan = makeLoan({ dueDate: "2026-07-20" });
    expect(computeLoanStatus(loan, events, "2026-07-13")).toBe("due-soon");
  });

  it("is overdue when the due date has passed", () => {
    const events = [makeEvent({ kind: "disbursement", amount: 100_000 })];
    const loan = makeLoan({ dueDate: "2026-07-01" });
    expect(computeLoanStatus(loan, events, "2026-07-13")).toBe("overdue");
  });
});

describe("computeLoanState", () => {
  it("bundles origin amount, outstanding balance, and status together", () => {
    const events = [
      makeEvent({ kind: "disbursement", amount: 100_000 }),
      makeEvent({ id: "e2", kind: "repayment", amount: 40_000 }),
    ];
    const loan = makeLoan({ dueDate: "2026-07-15" });
    expect(computeLoanState(loan, events, "2026-07-13")).toEqual({
      originAmount: 100_000,
      outstandingBalance: 60_000,
      status: "due-soon",
    });
  });
});

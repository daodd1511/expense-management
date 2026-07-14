import { describe, expect, it } from "vitest";
import {
  computeBalance,
  computeBalanceTrend,
  computeFinancialPosition,
  computeLoanOriginAmount,
  computeLoanOutstandingBalance,
  computeLoansSummary,
  computeLoanState,
  computeLoanStatus,
  computeNetWorthSnapshot,
  computeNetWorthTrend,
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

  it("subtracts an outflow loan transaction (lending disbursement) from its account", () => {
    const balance = computeBalance(
      "acc-1",
      [
        makeTx({
          type: "loan",
          amount: 300,
          accountId: "acc-1",
          cashFlowDirection: "outflow",
          loanEventId: "event-1",
          categoryId: null,
        }),
      ],
      1000,
    );
    expect(balance).toBe(700);
  });

  it("adds an inflow loan transaction (borrowing disbursement) to its account", () => {
    const balance = computeBalance(
      "acc-1",
      [
        makeTx({
          type: "loan",
          amount: 300,
          accountId: "acc-1",
          cashFlowDirection: "inflow",
          loanEventId: "event-1",
          categoryId: null,
        }),
      ],
      1000,
    );
    expect(balance).toBe(1300);
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

describe("computeLoansSummary", () => {
  it("sums lending/borrowing outstanding separately and derives net position", () => {
    const loans = [
      {
        loan: makeLoan({ id: "loan-lend", direction: "lending" as const }),
        events: [makeEvent({ loanId: "loan-lend", kind: "disbursement", amount: 100_000 })],
      },
      {
        loan: makeLoan({ id: "loan-borrow", direction: "borrowing" as const }),
        events: [makeEvent({ loanId: "loan-borrow", kind: "disbursement", amount: 30_000 })],
      },
    ];

    expect(computeLoansSummary(loans, "2026-07-13")).toEqual({
      owedToUser: 100_000,
      userOwes: 30_000,
      netPosition: 70_000,
      overdueCount: 0,
    });
  });

  it("counts only loans whose derived status is overdue", () => {
    const loans = [
      {
        loan: makeLoan({ id: "loan-overdue", direction: "lending" as const, dueDate: "2026-07-01" }),
        events: [makeEvent({ loanId: "loan-overdue", kind: "disbursement", amount: 50_000 })],
      },
      {
        loan: makeLoan({ id: "loan-open", direction: "lending" as const, dueDate: "2026-12-01" }),
        events: [makeEvent({ loanId: "loan-open", kind: "disbursement", amount: 50_000 })],
      },
      {
        loan: makeLoan({ id: "loan-repaid", direction: "borrowing" as const }),
        events: [
          makeEvent({ loanId: "loan-repaid", kind: "disbursement", amount: 20_000 }),
          makeEvent({ id: "e2", loanId: "loan-repaid", kind: "repayment", amount: 20_000 }),
        ],
      },
    ];

    expect(computeLoansSummary(loans, "2026-07-13").overdueCount).toBe(1);
  });
});

describe("computeNetWorthSnapshot", () => {
  it("combines account total with lending/borrowing outstanding", () => {
    const accounts = [{ id: "cash", openingBalance: 1_000_000 }];
    const transactions = [
      makeTx({ type: "expense", amount: 100_000, accountId: "cash", date: "2026-07-01" }),
    ];
    const loans = [
      {
        direction: "lending" as const,
        events: [makeEvent({ kind: "disbursement", amount: 200_000, date: "2026-07-01" })],
      },
      {
        direction: "borrowing" as const,
        events: [makeEvent({ kind: "disbursement", amount: 50_000, date: "2026-07-01" })],
      },
    ];

    expect(computeNetWorthSnapshot(accounts, transactions, loans)).toEqual({
      accountTotal: 900_000,
      lendingOutstanding: 200_000,
      borrowingOutstanding: 50_000,
      netWorth: 1_050_000,
    });
  });
});

describe("computeNetWorthTrend", () => {
  it("zero-fills months with no activity across the full window", () => {
    const accounts = [{ id: "cash", openingBalance: 1000 }];
    const points = computeNetWorthTrend(accounts, [], [], "2026-07", 3);
    expect(points).toEqual([
      { month: "2026-05", netWorth: 1000, accountTotal: 1000, lendingOutstanding: 0, borrowingOutstanding: 0 },
      { month: "2026-06", netWorth: 1000, accountTotal: 1000, lendingOutstanding: 0, borrowingOutstanding: 0 },
      { month: "2026-07", netWorth: 1000, accountTotal: 1000, lendingOutstanding: 0, borrowingOutstanding: 0 },
    ]);
  });

  it("folds a loan event into net worth from its event date's month-end onward", () => {
    const accounts = [{ id: "cash", openingBalance: 1_000_000 }];
    const transactions = [
      makeTx({
        id: "lend-tx",
        type: "loan",
        amount: 200_000,
        accountId: "cash",
        cashFlowDirection: "outflow",
        loanEventId: "lend-event",
        date: "2026-06-10",
      }),
    ];
    const loans = [
      {
        direction: "lending" as const,
        events: [
          makeEvent({ id: "lend-event", kind: "disbursement", amount: 200_000, date: "2026-06-10" }),
        ],
      },
    ];

    const points = computeNetWorthTrend(accounts, transactions, loans, "2026-07", 3);
    expect(points[0]).toEqual({
      month: "2026-05",
      netWorth: 1_000_000,
      accountTotal: 1_000_000,
      lendingOutstanding: 0,
      borrowingOutstanding: 0,
    });
    expect(points[1]).toEqual({
      month: "2026-06",
      netWorth: 1_000_000,
      accountTotal: 800_000,
      lendingOutstanding: 200_000,
      borrowingOutstanding: 0,
    });
    expect(points[2]).toEqual({
      month: "2026-07",
      netWorth: 1_000_000,
      accountTotal: 800_000,
      lendingOutstanding: 200_000,
      borrowingOutstanding: 0,
    });
  });

  it("zeroes a written-off loan's outstanding balance from its close date onward", () => {
    const accounts = [{ id: "cash", openingBalance: 1_000_000 }];
    const loans = [
      {
        direction: "borrowing" as const,
        events: [
          makeEvent({ kind: "disbursement", amount: 100_000, date: "2026-06-01" }),
          makeEvent({ id: "e2", kind: "write_off", amount: 100_000, date: "2026-07-01" }),
        ],
      },
    ];

    const points = computeNetWorthTrend(accounts, [], loans, "2026-07", 2);
    expect(points[0].borrowingOutstanding).toBe(100_000);
    expect(points[1].borrowingOutstanding).toBe(0);
  });
});

describe("computeFinancialPosition", () => {
  it("reconciles account total and net worth for a mixed period", () => {
    const accounts = [
      { id: "cash", openingBalance: 1_000_000 },
      { id: "bank", openingBalance: 500_000 },
    ];
    const transactions: Transaction[] = [
      makeTx({
        id: "salary",
        type: "income",
        amount: 300_000,
        accountId: "cash",
        date: "2026-07-02",
      }),
      makeTx({
        id: "rent",
        type: "expense",
        amount: 100_000,
        accountId: "cash",
        date: "2026-07-03",
      }),
      makeTx({
        id: "lend-tx",
        type: "loan",
        amount: 200_000,
        accountId: "cash",
        categoryId: null,
        cashFlowDirection: "outflow",
        loanEventId: "lend-event",
        date: "2026-07-04",
      }),
      makeTx({
        id: "repay-tx",
        type: "loan",
        amount: 50_000,
        accountId: "cash",
        categoryId: null,
        cashFlowDirection: "inflow",
        loanEventId: "repay-event",
        date: "2026-07-05",
      }),
      makeTx({
        id: "adjustment",
        type: "expense",
        amount: 5_000,
        accountId: "bank",
        date: "2026-07-06",
      }),
    ];
    const loans = [
      {
        direction: "lending" as const,
        events: [
          makeEvent({
            id: "lend-event",
            loanId: "loan-lend",
            kind: "disbursement",
            amount: 200_000,
            date: "2026-07-04",
          }),
          makeEvent({
            id: "repay-event",
            loanId: "loan-lend",
            kind: "repayment",
            amount: 50_000,
            date: "2026-07-05",
          }),
        ],
      },
    ];

    const report = computeFinancialPosition({
      accounts,
      transactionsThroughTo: transactions,
      loans,
      from: "2026-07-01",
      to: "2026-07-31",
      balanceAdjustmentTransactionIds: new Set(["adjustment"]),
    });

    expect(report.opening).toEqual({
      accountTotal: 1_500_000,
      lendingOutstanding: 0,
      borrowingOutstanding: 0,
      netWorth: 1_500_000,
    });
    expect(report.income).toBe(300_000);
    expect(report.expense).toBe(100_000);
    expect(report.surplus).toBe(200_000);
    expect(report.loanCashFlow).toEqual({
      lent: 200_000,
      borrowed: 0,
      lendingRepaymentsReceived: 50_000,
      borrowingRepaymentsPaid: 0,
      net: -150_000,
    });
    expect(report.balanceAdjustments).toBe(-5_000);
    expect(report.closing.lendingOutstanding).toBe(150_000);
    expect(report.reconciliation.accountTotal.matches).toBe(true);
    expect(report.reconciliation.netWorth.matches).toBe(true);
  });

  it("keeps opening-loan balances out of account-total reconciliation but inside net worth", () => {
    const accounts = [{ id: "cash", openingBalance: 1_000_000 }];
    const loans = [
      {
        direction: "borrowing" as const,
        events: [
          makeEvent({
            id: "open-event",
            loanId: "loan-open",
            kind: "opening",
            amount: 80_000,
            date: "2026-07-10",
          }),
        ],
      },
    ];

    const report = computeFinancialPosition({
      accounts,
      transactionsThroughTo: [],
      loans,
      from: "2026-07-01",
      to: "2026-07-31",
      balanceAdjustmentTransactionIds: new Set(),
    });

    expect(report.openingLoanAdjustments).toEqual({ lending: 0, borrowing: 80_000 });
    expect(report.closing.accountTotal).toBe(1_000_000);
    expect(report.closing.netWorth).toBe(1_000_000 - 80_000);
    expect(report.reconciliation.accountTotal.matches).toBe(true);
    expect(report.reconciliation.netWorth.matches).toBe(true);
  });

  it("reflects a write-off as a net-worth loss with zero remaining outstanding", () => {
    const accounts = [{ id: "cash", openingBalance: 0 }];
    const loans = [
      {
        direction: "lending" as const,
        events: [
          makeEvent({
            id: "d1",
            loanId: "loan-wo",
            kind: "disbursement",
            amount: 100_000,
            date: "2026-06-01",
          }),
          makeEvent({
            id: "wo1",
            loanId: "loan-wo",
            kind: "write_off",
            amount: 100_000,
            date: "2026-07-15",
          }),
        ],
      },
    ];
    const transactions: Transaction[] = [
      makeTx({
        id: "d1-tx",
        type: "loan",
        amount: 100_000,
        accountId: "cash",
        categoryId: null,
        cashFlowDirection: "outflow",
        loanEventId: "d1",
        date: "2026-06-01",
      }),
    ];

    const report = computeFinancialPosition({
      accounts,
      transactionsThroughTo: transactions,
      loans,
      from: "2026-07-01",
      to: "2026-07-31",
      balanceAdjustmentTransactionIds: new Set(),
    });

    expect(report.writeOffs).toBe(100_000);
    expect(report.opening.lendingOutstanding).toBe(100_000);
    expect(report.closing.lendingOutstanding).toBe(0);
    expect(report.reconciliation.netWorth.matches).toBe(true);
  });
});

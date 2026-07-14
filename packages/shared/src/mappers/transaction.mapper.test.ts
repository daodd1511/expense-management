import { describe, expect, it } from "vitest";
import type { TransactionRow } from "../dtos";
import { fromTransaction, toTransaction } from "./transaction.mapper";

function makeRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: "tx-1",
    owner_id: "user-1",
    type: "expense",
    amount: 1000,
    category_id: "cat-1",
    account_id: "acc-1",
    to_account_id: null,
    merchant: "Coffee",
    note: null,
    tx_date: "2026-07-01",
    tx_time: null,
    receipt_url: null,
    subscription_id: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toTransaction", () => {
  it("carries cashFlowDirection and loanEventId through for a loan row", () => {
    const transaction = toTransaction(
      makeRow({
        type: "loan",
        category_id: null,
        cash_flow_direction: "inflow",
        loan_event_id: "event-1",
      }),
    );

    expect(transaction.cashFlowDirection).toBe("inflow");
    expect(transaction.loanEventId).toBe("event-1");
  });

  it("leaves cashFlowDirection undefined for a non-loan row", () => {
    const transaction = toTransaction(makeRow());
    expect(transaction.cashFlowDirection).toBeUndefined();
    expect(transaction.loanEventId).toBeFalsy();
  });
});

describe("fromTransaction", () => {
  it("writes cash_flow_direction and loan_event_id for a loan transaction", () => {
    const row = fromTransaction({
      transaction: {
        type: "loan",
        amount: 1000,
        categoryId: null,
        accountId: "acc-1",
        merchant: "Lent",
        date: "2026-07-01",
        cashFlowDirection: "outflow",
        loanEventId: "event-1",
      },
      ownerId: "user-1",
    });

    expect(row.cash_flow_direction).toBe("outflow");
    expect(row.loan_event_id).toBe("event-1");
  });

  it("writes null for both fields on a non-loan transaction", () => {
    const row = fromTransaction({
      transaction: {
        type: "expense",
        amount: 1000,
        categoryId: "cat-1",
        accountId: "acc-1",
        merchant: "Coffee",
        date: "2026-07-01",
      },
      ownerId: "user-1",
    });

    expect(row.cash_flow_direction).toBeNull();
    expect(row.loan_event_id).toBeNull();
  });
});

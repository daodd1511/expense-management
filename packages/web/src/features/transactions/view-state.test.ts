import { describe, expect, it } from "vitest";
import type { Transaction } from "@/core/types";
import {
  buildTransactionsSearch,
  matchesTransactionSelection,
  parseTransactionsViewState,
} from "./view-state";

const expense: Transaction = {
  id: "tx-1",
  type: "expense",
  amount: 100,
  categoryId: "food",
  accountId: "cash",
  toAccountId: null,
  merchant: "Lunch",
  date: "2026-07-13",
  receipt: null,
  subscriptionId: null,
};

const transfer: Transaction = {
  ...expense,
  id: "tx-2",
  type: "transfer",
  categoryId: null,
  toAccountId: "bank",
};

describe("transaction view state", () => {
  it("parses legacy singular and comma-separated filter IDs", () => {
    const state = parseTransactionsViewState({
      categoryId: "food,transport",
      accountId: "cash",
    });

    expect(state.categoryIds).toEqual(["food", "transport"]);
    expect(state.accountIds).toEqual(["cash"]);
  });

  it("normalizes repeated values and omits empty filters when building search", () => {
    const state = parseTransactionsViewState({
      categoryId: ["food", "transport,food", ""],
      accountId: null,
    });

    expect(state.categoryIds).toEqual(["food", "transport"]);
    expect(buildTransactionsSearch(state)).toMatchObject({
      categoryId: "food,transport",
      accountId: undefined,
    });
  });

  it("matches any selected category and either account side of a transfer", () => {
    expect(matchesTransactionSelection(expense, ["transport", "food"], ["bank", "cash"])).toBe(
      true,
    );
    expect(matchesTransactionSelection(transfer, [], ["bank"])).toBe(true);
    expect(matchesTransactionSelection(expense, ["transport"], ["cash"])).toBe(false);
    expect(matchesTransactionSelection(expense, ["food"], ["bank"])).toBe(false);
  });
});

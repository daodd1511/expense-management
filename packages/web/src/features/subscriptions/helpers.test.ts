import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, Subscription, Transaction } from "@/core/types";
import {
  buildNextDueDate,
  daysUntilDue,
  isAlreadyLoggedThisCycle,
  isDue,
  isDueSoon,
  underfundedAccounts,
} from "./helpers";

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    amount: 100_000,
    type: "expense",
    categoryId: "fun",
    accountId: "acc-1",
    cadence: "monthly",
    dayOfMonth: 1,
    monthOfYear: 1,
    nextDueDate: "2026-07-05",
    active: true,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    type: "expense",
    amount: 100_000,
    categoryId: "fun",
    accountId: "acc-1",
    merchant: "Netflix",
    date: "2026-07-05",
    subscriptionId: "sub-1",
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    name: "Itel",
    kind: "ewallet",
    openingBalance: 0,
    displayOrder: 0,
    balance: 14_102,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 5, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("daysUntilDue", () => {
  it("is 0 when due today", () => {
    expect(daysUntilDue(makeSub({ nextDueDate: "2026-07-05" }))).toBe(0);
  });

  it("is positive when due in the future", () => {
    expect(daysUntilDue(makeSub({ nextDueDate: "2026-07-10" }))).toBe(5);
  });

  it("is negative when overdue", () => {
    expect(daysUntilDue(makeSub({ nextDueDate: "2026-07-01" }))).toBe(-4);
  });

  it("does not drift a day at the local UTC+ boundary (regression for F3)", () => {
    // Same calendar day as "now", parsed at local midnight — must read as due today
    // regardless of the host's UTC offset.
    expect(daysUntilDue(makeSub({ nextDueDate: "2026-07-05" }))).toBe(0);
  });
});

describe("isDue / isDueSoon", () => {
  it("isDue is true when due today or overdue, and active", () => {
    expect(isDue(makeSub({ nextDueDate: "2026-07-05" }))).toBe(true);
    expect(isDue(makeSub({ nextDueDate: "2026-07-01" }))).toBe(true);
  });

  it("isDue is false when inactive even if overdue", () => {
    expect(isDue(makeSub({ nextDueDate: "2026-07-01", active: false }))).toBe(false);
  });

  it("isDue is false when due in the future", () => {
    expect(isDue(makeSub({ nextDueDate: "2026-07-06" }))).toBe(false);
  });

  it("isDueSoon is true within the next 7 days, inclusive of today", () => {
    expect(isDueSoon(makeSub({ nextDueDate: "2026-07-10" }))).toBe(true);
    expect(isDueSoon(makeSub({ nextDueDate: "2026-07-05" }))).toBe(true);
    expect(isDueSoon(makeSub({ nextDueDate: "2026-07-13" }))).toBe(false);
  });
});

describe("isAlreadyLoggedThisCycle", () => {
  it("is true for a matching transaction inside the prior-cycle window", () => {
    const sub = makeSub({ nextDueDate: "2026-07-05", cadence: "monthly" });
    const tx = makeTx({ subscriptionId: "sub-1", date: "2026-06-20" });
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(true);
  });

  it("is false when the transaction belongs to a different subscription", () => {
    const sub = makeSub({ nextDueDate: "2026-07-05" });
    const tx = makeTx({ subscriptionId: "other-sub", date: "2026-06-20" });
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(false);
  });

  it("is false when the transaction is outside the window", () => {
    const sub = makeSub({ nextDueDate: "2026-07-05", cadence: "monthly" });
    const tx = makeTx({ subscriptionId: "sub-1", date: "2026-05-01" });
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(false);
  });

  it("handles the yearly cadence window", () => {
    const sub = makeSub({ nextDueDate: "2026-07-05", cadence: "yearly" });
    const tx = makeTx({ subscriptionId: "sub-1", date: "2026-01-15" });
    expect(isAlreadyLoggedThisCycle(sub, [tx])).toBe(true);
  });
});

describe("underfundedAccounts", () => {
  it("reports the exact shortfall when the balance is below the horizon sum", () => {
    const account = makeAccount({ balance: 14_102 });
    const sub = makeSub({ amount: 79_000, nextDueDate: "2026-08-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([{ account, shortfall: 64_898 }]);
  });

  it("reports nothing when the balance exactly meets the horizon sum", () => {
    const account = makeAccount({ balance: 79_000 });
    const sub = makeSub({ amount: 79_000, nextDueDate: "2026-08-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([]);
  });

  it("never reports a card account, whatever its balance", () => {
    const account = makeAccount({ kind: "card", balance: -5_000_000 });
    const sub = makeSub({ amount: 79_000, nextDueDate: "2026-08-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([]);
  });

  it("reports nothing for an account with no subscription charging it", () => {
    const account = makeAccount({ id: "acc-2", balance: 0 });
    const sub = makeSub({ accountId: "acc-1", nextDueDate: "2026-08-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([]);
  });

  it("excludes inactive subscriptions from the horizon sum", () => {
    const account = makeAccount({ balance: 0 });
    const sub = makeSub({ amount: 79_000, nextDueDate: "2026-08-01", active: false });
    expect(underfundedAccounts([account], [sub])).toEqual([]);
  });

  it("excludes a yearly charge falling outside the horizon", () => {
    const account = makeAccount({ balance: 0 });
    const sub = makeSub({ cadence: "yearly", amount: 900_000, nextDueDate: "2026-12-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([]);
  });

  it("includes a yearly charge once it enters the horizon", () => {
    const account = makeAccount({ balance: 0 });
    const sub = makeSub({ cadence: "yearly", amount: 900_000, nextDueDate: "2026-08-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([{ account, shortfall: 900_000 }]);
  });

  it("includes an overdue, unlogged charge", () => {
    const account = makeAccount({ balance: 0 });
    const sub = makeSub({ amount: 79_000, nextDueDate: "2026-06-20" });
    expect(underfundedAccounts([account], [sub])).toEqual([{ account, shortfall: 79_000 }]);
  });

  it("sums multiple subscriptions charging the same account", () => {
    const account = makeAccount({ balance: 100_000 });
    const subs = [
      makeSub({ id: "sub-1", amount: 79_000, nextDueDate: "2026-07-20" }),
      makeSub({ id: "sub-2", amount: 50_000, nextDueDate: "2026-08-01" }),
    ];
    expect(underfundedAccounts([account], subs)).toEqual([{ account, shortfall: 29_000 }]);
  });

  it("treats the thirtieth day as inside the horizon and the thirty-first as outside", () => {
    const account = makeAccount({ balance: 0 });
    const inside = makeSub({ amount: 79_000, nextDueDate: "2026-08-04" });
    const outside = makeSub({ amount: 79_000, nextDueDate: "2026-08-05" });
    expect(underfundedAccounts([account], [inside])).toEqual([{ account, shortfall: 79_000 }]);
    expect(underfundedAccounts([account], [outside])).toEqual([]);
  });

  it("falls back to the opening balance when no computed balance is present", () => {
    const account = makeAccount({ balance: undefined, openingBalance: 10_000 });
    const sub = makeSub({ amount: 79_000, nextDueDate: "2026-08-01" });
    expect(underfundedAccounts([account], [sub])).toEqual([{ account, shortfall: 69_000 }]);
  });
});

describe("buildNextDueDate", () => {
  it("monthly: returns this month if the day has not passed yet", () => {
    expect(buildNextDueDate(20, 1, "monthly")).toBe("2026-07-20");
  });

  it("monthly: rolls to next month if the day already passed", () => {
    expect(buildNextDueDate(1, 1, "monthly")).toBe("2026-08-01");
  });

  it("monthly: today counts as already passed", () => {
    expect(buildNextDueDate(5, 1, "monthly")).toBe("2026-08-05");
  });

  it("yearly: returns this year if the date has not passed yet", () => {
    expect(buildNextDueDate(1, 12, "yearly")).toBe("2026-12-01");
  });

  it("yearly: rolls to next year if the date already passed", () => {
    expect(buildNextDueDate(1, 1, "yearly")).toBe("2027-01-01");
  });
});

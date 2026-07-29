import { buildNextDueDate as buildNextDueDateShared } from "@wallet/shared";
import { diffDays, parseLocalDate, todayLocalIso } from "@/shared/lib/date";
import type { Account, Subscription, SubscriptionCadence, Transaction } from "@/core/types";

/**
 * Window over which upcoming Subscription charges are summed when deciding whether an
 * Account is underfunded. Deliberately distinct from the seven-day _Due soon_ window:
 * the two answer different questions and must not be merged.
 */
export const FUNDING_HORIZON_DAYS = 30;

/** An Account whose Computed balance falls short of its charges inside the funding horizon. */
export type UnderfundedAccount = {
  account: Account;
  /** Positive Đồng amount by which the balance falls short of the horizon sum. */
  shortfall: number;
};

export function monthlyEquivalent(s: Subscription): number {
  return s.cadence === "yearly" ? Math.round(s.amount / 12) : s.amount;
}

export function totalMonthlyCost(subscriptions: Subscription[]): number {
  return subscriptions.filter((s) => s.active).reduce((sum, s) => sum + monthlyEquivalent(s), 0);
}

export function daysUntilDue(sub: Subscription): number {
  return diffDays(sub.nextDueDate, todayLocalIso());
}

export function isDue(sub: Subscription): boolean {
  return sub.active && daysUntilDue(sub) <= 0;
}

export function isDueSoon(sub: Subscription): boolean {
  const days = daysUntilDue(sub);
  return sub.active && days >= 0 && days <= 7;
}

/**
 * Accounts that cannot cover the active Subscriptions charged to them inside the funding
 * horizon, each with its shortfall.
 *
 * A `card` Account is never underfunded — its balance represents debt, not available funds.
 * A charge whose `nextDueDate` has already passed still counts: an unlogged Subscription's
 * `nextDueDate` does not advance, so the money is still owed.
 *
 * @param today date-only `'YYYY-MM-DD'`; defaults to the client's local calendar date.
 */
export function underfundedAccounts(
  accounts: Account[],
  subscriptions: Subscription[],
  today: string = todayLocalIso(),
): UnderfundedAccount[] {
  const horizonSumByAccount = new Map<string, number>();
  for (const sub of subscriptions) {
    if (!sub.active) continue;
    if (diffDays(sub.nextDueDate, today) > FUNDING_HORIZON_DAYS) continue;
    horizonSumByAccount.set(sub.accountId, (horizonSumByAccount.get(sub.accountId) ?? 0) + sub.amount);
  }

  return accounts.flatMap((account) => {
    if (account.kind === "card") return [];
    const horizonSum = horizonSumByAccount.get(account.id);
    if (horizonSum === undefined) return [];
    const balance = account.balance ?? account.openingBalance;
    if (balance >= horizonSum) return [];
    return [{ account, shortfall: horizonSum - balance }];
  });
}

export function isAlreadyLoggedThisCycle(sub: Subscription, transactions: Transaction[]): boolean {
  const due = parseLocalDate(sub.nextDueDate);
  // Check prev cycle window: from (nextDue - cadenceDays) to nextDue
  const windowStart = new Date(due);
  if (sub.cadence === "monthly") windowStart.setMonth(windowStart.getMonth() - 1);
  else windowStart.setFullYear(windowStart.getFullYear() - 1);

  return transactions.some((tx) => {
    if (tx.subscriptionId !== sub.id) return false;
    const txDate = parseLocalDate(tx.date);
    return txDate >= windowStart && txDate <= due;
  });
}

export function dueBanner(
  subscriptions: Subscription[],
  transactions: Transaction[],
): Subscription[] {
  return subscriptions.filter((s) => isDue(s) && !isAlreadyLoggedThisCycle(s, transactions));
}

/**
 * Thin wrapper over the shared implementation (also used server-side to compute
 * `nextDueDate` authoritatively) — supplies "today" from the client's local clock, since
 * the caller-facing signature here has no `today` parameter of its own.
 */
export function buildNextDueDate(
  dayOfMonth: number,
  monthOfYear: number,
  cadence: SubscriptionCadence,
): string {
  return buildNextDueDateShared(dayOfMonth, monthOfYear, cadence, todayLocalIso());
}

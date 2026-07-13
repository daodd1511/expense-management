import type { Subscription, SubscriptionCadence } from "../models";
import type { SubscriptionPatch, SubscriptionRow } from "../dtos";

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    accountId: row.account_id,
    cadence: row.cadence,
    dayOfMonth: row.day_of_month,
    monthOfYear: row.month_of_year,
    nextDueDate: row.next_due_date,
    note: row.note ?? undefined,
    active: row.active,
  };
}

export function fromSubscription(params: {
  subscription: Omit<Subscription, "id">;
  ownerId: string;
}) {
  const { subscription, ownerId } = params;
  return {
    owner_id: ownerId,
    name: subscription.name,
    amount: subscription.amount,
    type: subscription.type,
    category_id: subscription.categoryId ?? null,
    account_id: subscription.accountId,
    cadence: subscription.cadence,
    day_of_month: subscription.dayOfMonth,
    month_of_year: subscription.monthOfYear,
    next_due_date: subscription.nextDueDate,
    note: subscription.note ?? null,
    active: subscription.active,
  };
}

export function subscriptionPatchToRow(patch: SubscriptionPatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.amount !== undefined && { amount: patch.amount }),
    ...(patch.type !== undefined && { type: patch.type }),
    ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
    ...(patch.accountId !== undefined && { account_id: patch.accountId }),
    ...(patch.cadence !== undefined && { cadence: patch.cadence }),
    ...(patch.dayOfMonth !== undefined && { day_of_month: patch.dayOfMonth }),
    ...(patch.monthOfYear !== undefined && { month_of_year: patch.monthOfYear }),
    ...(patch.note !== undefined && { note: patch.note }),
    ...(patch.active !== undefined && { active: patch.active }),
  };
}

/**
 * `nextDueDate`/`todayIso` are date-only 'YYYY-MM-DD' strings with no time or timezone
 * component. Parsing them with `new Date(iso)` reads as UTC midnight; mutating that via
 * setMonth/setFullYear (which operate in the runtime's local timezone) and re-serializing
 * with toISOString (UTC) can silently drift a day depending on the server process's
 * timezone. These helpers stay entirely in the local-calendar-date frame instead.
 */
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Advances a subscription's existing `nextDueDate` by one cadence period. */
export function advanceNextDueDate(subscription: Subscription): string {
  const nextDate = parseLocalDate(subscription.nextDueDate);
  if (subscription.cadence === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  return toLocalIso(nextDate);
}

/**
 * Computes the next occurrence of a subscription's schedule on or after `todayIso`. Never
 * returns `todayIso` itself if the day has already passed this cycle — always the next
 * future occurrence. `todayIso` must be the caller's local calendar date (the server has no
 * per-user timezone, so it never assumes its own clock is the user's "today").
 */
export function buildNextDueDate(
  dayOfMonth: number,
  monthOfYear: number,
  cadence: SubscriptionCadence,
  todayIso: string,
): string {
  const today = parseLocalDate(todayIso);
  if (cadence === "monthly") {
    const candidate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return toLocalIso(candidate);
  }
  const candidate = new Date(today.getFullYear(), monthOfYear - 1, dayOfMonth);
  if (candidate <= today) candidate.setFullYear(candidate.getFullYear() + 1);
  return toLocalIso(candidate);
}

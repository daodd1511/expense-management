import {
  advanceNextDueDate,
  buildNextDueDate,
  type SubscriptionCreate,
  type SubscriptionPatch,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listSubscriptions(db: AppDb, userId: string) {
  return repository.listSubscriptions(db, userId);
}

export async function createSubscription(db: AppDb, userId: string, input: SubscriptionCreate) {
  const { today, ...subscriptionInput } = input;
  if (!(await repository.referencesAreAccessible(db, userId, subscriptionInput))) {
    throw new ApiError(404, "Referenced resource not found");
  }

  const nextDueDate = buildNextDueDate(
    subscriptionInput.dayOfMonth,
    subscriptionInput.monthOfYear,
    subscriptionInput.cadence,
    today,
  );

  return repository.createSubscription(db, userId, { ...subscriptionInput, nextDueDate });
}

export async function logSubscription(db: AppDb, userId: string, id: string, today: string) {
  const subscription = await repository.loadSubscription(db, userId, id);
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const nextDueDate = advanceNextDueDate(subscription);
  const updated = await repository.logSubscription(db, {
    userId,
    subscription,
    today,
    nextDueDate,
  });
  if (!updated) {
    throw new ApiError(404, "Subscription not found");
  }

  return updated;
}

export async function updateSubscription(
  db: AppDb,
  userId: string,
  id: string,
  input: SubscriptionPatch,
) {
  const { today, ...patch } = input;
  if (!(await repository.referencesAreAccessible(db, userId, patch))) {
    throw new ApiError(404, "Referenced resource not found");
  }

  const scheduleChanged =
    patch.dayOfMonth !== undefined ||
    patch.monthOfYear !== undefined ||
    patch.cadence !== undefined;

  const row: ReturnType<typeof repository.subscriptionPatchToRow> & { next_due_date?: string } =
    repository.subscriptionPatchToRow(patch);

  if (scheduleChanged) {
    const current = await repository.loadSubscriptionSchedule(db, userId, id);
    if (!current) {
      throw new ApiError(404, "Subscription not found");
    }

    row.next_due_date = buildNextDueDate(
      patch.dayOfMonth ?? current.day_of_month,
      patch.monthOfYear ?? current.month_of_year,
      patch.cadence ?? (current.cadence as "monthly" | "yearly"),
      today as string,
    );
  }

  const subscription = await repository.updateSubscription(db, userId, id, row);
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  return subscription;
}

export async function deleteSubscription(db: AppDb, userId: string, id: string) {
  const deleted = await repository.deleteSubscription(db, userId, id);
  if (!deleted) {
    throw new ApiError(404, "Subscription not found");
  }
}

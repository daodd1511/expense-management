import {
  advanceNextDueDate,
  buildNextDueDate,
  type SubscriptionCreate,
  type SubscriptionPatch,
} from "@wallet/shared";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listSubscriptions(userId: string) {
  return repository.listSubscriptions(userId);
}

export async function createSubscription(userId: string, input: SubscriptionCreate) {
  const { today, ...subscriptionInput } = input;
  const nextDueDate = buildNextDueDate(
    subscriptionInput.dayOfMonth,
    subscriptionInput.monthOfYear,
    subscriptionInput.cadence,
    today,
  );

  return repository.createSubscription(userId, { ...subscriptionInput, nextDueDate });
}

export async function logSubscription(userId: string, id: string, today: string) {
  const subscription = await repository.loadSubscription(userId, id);
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const nextDueDate = advanceNextDueDate(subscription);
  const updated = await repository.logSubscription({ userId, subscription, today, nextDueDate });
  if (!updated) {
    throw new ApiError(404, "Subscription not found");
  }

  return updated;
}

export async function updateSubscription(userId: string, id: string, input: SubscriptionPatch) {
  const { today, ...patch } = input;
  const scheduleChanged =
    patch.dayOfMonth !== undefined ||
    patch.monthOfYear !== undefined ||
    patch.cadence !== undefined;

  const row: ReturnType<typeof repository.subscriptionPatchToRow> & { next_due_date?: string } =
    repository.subscriptionPatchToRow(patch);

  if (scheduleChanged) {
    const current = await repository.loadSubscriptionSchedule(userId, id);
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

  const subscription = await repository.updateSubscription(userId, id, row);
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  return subscription;
}

export async function deleteSubscription(userId: string, id: string) {
  const deleted = await repository.deleteSubscription(userId, id);
  if (!deleted) {
    throw new ApiError(404, "Subscription not found");
  }
}

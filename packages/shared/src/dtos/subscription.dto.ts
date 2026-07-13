import { z } from "zod";
import { subscriptionCadenceSchema } from "../models";
import { atLeastOneKey, isoDateSchema } from "./common.dto";

export const subscriptionRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(["expense", "income"]),
  category_id: z.string().nullable(),
  account_id: z.string(),
  cadence: subscriptionCadenceSchema,
  day_of_month: z.number(),
  month_of_year: z.number(),
  next_due_date: z.string(),
  note: z.string().nullable(),
  active: z.boolean(),
  created_at: z.string(),
});

export const subscriptionCreateSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number(),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().min(1).nullable(),
  accountId: z.string().min(1),
  cadence: subscriptionCadenceSchema,
  dayOfMonth: z.number().int().min(1).max(31),
  monthOfYear: z.number().int().min(1).max(12),
  // Caller's local calendar date — the server has no per-user timezone, so nextDueDate is
  // always computed server-side (buildNextDueDate) from this, never trusted from the client.
  today: isoDateSchema,
  note: z.string().trim().optional(),
  active: z.boolean(),
});

export const subscriptionPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  amount: z.number(),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().min(1).nullable(),
  accountId: z.string().min(1),
  cadence: subscriptionCadenceSchema,
  dayOfMonth: z.number().int().min(1).max(31),
  monthOfYear: z.number().int().min(1).max(12),
  today: isoDateSchema,
  note: z.string().trim().nullable(),
  active: z.boolean(),
}).refine(
  (value) => {
    const scheduleChanged =
      value.dayOfMonth !== undefined ||
      value.monthOfYear !== undefined ||
      value.cadence !== undefined;
    return !scheduleChanged || value.today !== undefined;
  },
  { message: "today is required when dayOfMonth, monthOfYear, or cadence changes" },
);

export type SubscriptionRow = z.infer<typeof subscriptionRowSchema>;
export type SubscriptionCreate = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionPatch = z.infer<typeof subscriptionPatchSchema>;

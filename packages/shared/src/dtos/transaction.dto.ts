import { z } from "zod";
import { loanCashFlowDirectionSchema, txTypeSchema } from "../models";
import { isoDateSchema, localTimeSchema } from "./common.dto";

// "Not in the future" is validated server-side against the client's timezone
// (`rejectFutureDates` middleware in packages/api), not here — the DTO can only
// see a server-local `new Date()`, which drifts a day for zones ahead of UTC.
const transactionDateSchema = isoDateSchema;

export const transactionRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  type: txTypeSchema,
  amount: z.number(),
  category_id: z.string().nullable(),
  account_id: z.string(),
  to_account_id: z.string().nullable(),
  merchant: z.string(),
  note: z.string().nullable(),
  tx_date: z.string(),
  tx_time: z.string().nullable().optional(),
  receipt_url: z.string().nullable(),
  subscription_id: z.string().nullable(),
  linked_transfer_id: z.string().nullable().optional(),
  cash_flow_direction: loanCashFlowDirectionSchema.nullable().optional(),
  loan_event_id: z.string().nullable().optional(),
  created_at: z.string(),
});

export const transactionCreateSchema = z
  .object({
    type: txTypeSchema,
    amount: z.number(),
    categoryId: z.string().min(1).nullable(),
    accountId: z.string().min(1),
    toAccountId: z.string().min(1).nullable().optional(),
    merchant: z.string().trim().min(1),
    note: z.string().trim().optional(),
    date: transactionDateSchema,
    time: localTimeSchema.optional(),
    receipt: z.string().trim().nullable().optional(),
    subscriptionId: z.string().min(1).nullable().optional(),
    fee: z.number().nonnegative().optional(),
  })
  .strict();

const transactionPatchObjectSchema = z
  .object({
    type: txTypeSchema,
    amount: z.number(),
    categoryId: z.string().min(1).nullable(),
    accountId: z.string().min(1),
    toAccountId: z.string().min(1).nullable(),
    merchant: z.string().trim().min(1),
    note: z.string().trim().nullable(),
    date: transactionDateSchema,
    time: localTimeSchema.nullable(),
    receipt: z.string().trim().nullable(),
    fee: z.number().nonnegative(),
  })
  .partial()
  .strict();

export const transactionPatchSchema = transactionPatchObjectSchema.refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one field is required",
  },
);

export const transactionBulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type TransactionRow = z.infer<typeof transactionRowSchema>;
export type TransactionCreate = z.infer<typeof transactionCreateSchema>;
export type TransactionPatch = z.infer<typeof transactionPatchSchema>;
export type TransactionBulkDelete = z.infer<typeof transactionBulkDeleteSchema>;

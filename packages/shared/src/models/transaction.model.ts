import { z } from "zod";
import { txTypeSchema } from "./common.model";
import { loanCashFlowDirectionSchema } from "./loan.model";

/**
 * Not a `z.discriminatedUnion` — this stays a flat optional-field object, consistent with
 * how transfer's `toAccountId`/`fee` are already modeled, rather than a system-wide
 * restructuring of every Transaction consumer. Cross-field validity for `type: 'loan'` is
 * enforced by `superRefine` below instead of the type system: `cashFlowDirection` and
 * `loanEventId` are present only for loan rows, and `categoryId`/`toAccountId` are null
 * for them (see PLAN.md → "Transaction Model").
 */
export const transactionSchema = z
  .object({
    id: z.string(),
    type: txTypeSchema,
    amount: z.number(),
    categoryId: z.string().nullable(),
    accountId: z.string(),
    toAccountId: z.string().nullable().optional(),
    merchant: z.string(),
    note: z.string().optional(),
    date: z.string(),
    time: z.string().optional(),
    balanceAfter: z.number().optional(),
    toAccountBalanceAfter: z.number().optional(),
    receipt: z.string().nullable().optional(),
    subscriptionId: z.string().nullable().optional(),
    linkedTransferId: z.string().nullable().optional(),
    fee: z.number().nonnegative().optional(),
    cashFlowDirection: loanCashFlowDirectionSchema.optional(),
    loanEventId: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "loan") {
      if (!value.cashFlowDirection || !value.loanEventId) {
        ctx.addIssue({
          code: "custom",
          message: "Loan transactions require cashFlowDirection and loanEventId",
        });
      }
      if (value.categoryId !== null || (value.toAccountId ?? null) !== null) {
        ctx.addIssue({
          code: "custom",
          message: "Loan transactions must have no category or destination account",
        });
      }
      return;
    }

    if (value.cashFlowDirection !== undefined || (value.loanEventId ?? null) !== null) {
      ctx.addIssue({
        code: "custom",
        message: "Only loan transactions may set cashFlowDirection or loanEventId",
      });
    }
  });

export type Transaction = Readonly<z.infer<typeof transactionSchema>>;

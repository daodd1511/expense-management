import {
  monthFilterSchema,
  transactionBulkDeleteSchema,
  transactionCreateSchema as sharedTransactionCreateSchema,
  transactionPatchSchema,
} from "@wallet/shared";

export { monthFilterSchema, transactionBulkDeleteSchema, transactionPatchSchema };

/** Only the Loans feature's own RPCs may create `type: 'loan'` rows (PLAN.md -> "Mutation
 * Ownership and Atomicity"); generic transaction create rejects it. */
export const transactionCreateSchema = sharedTransactionCreateSchema.refine(
  (value) => value.type !== "loan",
  { message: "Loan transactions can only be created through Loans" },
);

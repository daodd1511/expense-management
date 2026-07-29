import { z } from "zod";

export const budgetScopeSchema = z.enum(["self", "tree"]);

export const budgetSchema = z.object({
  categoryId: z.string(),
  limit: z.number(),
  scope: budgetScopeSchema,
});

export type BudgetScope = z.infer<typeof budgetScopeSchema>;
export type Budget = Readonly<z.infer<typeof budgetSchema>>;

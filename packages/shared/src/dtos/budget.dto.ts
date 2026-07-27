import { z } from "zod";
import { budgetScopeSchema } from "../models";

export const budgetRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  category_id: z.string(),
  amount: z.number(),
  scope: budgetScopeSchema,
  created_at: z.string(),
});

export const budgetCreateSchema = z.object({
  categoryId: z.string().min(1),
  limit: z.number(),
  scope: budgetScopeSchema,
});

export const budgetPatchSchema = z.object({
  limit: z.number(),
  scope: budgetScopeSchema.optional(),
});

export type BudgetRow = z.infer<typeof budgetRowSchema>;
export type BudgetCreate = z.infer<typeof budgetCreateSchema>;
export type BudgetPatch = z.infer<typeof budgetPatchSchema>;

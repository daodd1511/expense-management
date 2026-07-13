import { z } from "zod";

export const budgetSchema = z.object({
  categoryId: z.string(),
  limit: z.number(),
});

export type Budget = Readonly<z.infer<typeof budgetSchema>>;

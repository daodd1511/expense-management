import { z } from "zod";

export const categoryTypeSchema = z.enum(["expense", "income"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  isSystem: z.boolean(),
  isHidden: z.boolean(),
  type: categoryTypeSchema,
  parentId: z.string().nullable(),
});

export type Category = Readonly<z.infer<typeof categorySchema>>;

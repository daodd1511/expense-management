import { z } from "zod";

export const favoriteSchema = z.object({
  categoryId: z.string(),
});

export type Favorite = Readonly<z.infer<typeof favoriteSchema>>;

import { z } from "zod";
import { accountKindSchema } from "./common.model";

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: accountKindSchema,
  openingBalance: z.number(),
  displayOrder: z.number().int().nonnegative(),
  balance: z.number().optional(),
});

export type Account = Readonly<z.infer<typeof accountSchema>>;

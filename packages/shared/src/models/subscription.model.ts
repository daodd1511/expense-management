import { z } from "zod";
import { subscriptionCadenceSchema } from "./common.model";

export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().nullable(),
  accountId: z.string(),
  cadence: subscriptionCadenceSchema,
  dayOfMonth: z.number(),
  monthOfYear: z.number(),
  nextDueDate: z.string(),
  note: z.string().optional(),
  active: z.boolean(),
});

export type Subscription = Readonly<z.infer<typeof subscriptionSchema>>;

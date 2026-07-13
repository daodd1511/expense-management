import { z } from "zod";
import { monthFilterSchema } from "./common.dto";

export const balanceTrendPointSchema = z.object({
  month: monthFilterSchema,
  balance: z.number(),
});

export const balanceTrendResponseSchema = z.object({
  data: z.array(balanceTrendPointSchema),
});

export type BalanceTrendPoint = z.infer<typeof balanceTrendPointSchema>;
export type BalanceTrendResponse = z.infer<typeof balanceTrendResponseSchema>;

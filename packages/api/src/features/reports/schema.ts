import { isoDateSchema, spendingAnalysisPresetSchema } from "@wallet/shared";
import { z } from "zod";

export const reportQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Range end must be on or after range start",
      });
    }
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const spendingAnalysisQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    preset: spendingAnalysisPresetSchema,
  })
  .superRefine((value, ctx) => {
    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Range end must be on or after range start",
      });
    }
  });

export type SpendingAnalysisQuery = z.infer<typeof spendingAnalysisQuerySchema>;

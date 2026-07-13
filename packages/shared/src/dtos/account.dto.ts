import { z } from "zod";
import { accountKindSchema } from "../models";
import { atLeastOneKey } from "./common.dto";

export const accountRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  kind: accountKindSchema,
  opening_balance: z.number(),
  archived: z.boolean(),
  created_at: z.string(),
});

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1),
  kind: accountKindSchema,
  openingBalance: z.number(),
});

export const accountPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  kind: accountKindSchema,
  openingBalance: z.number(),
});

export type AccountRow = z.infer<typeof accountRowSchema>;
export type AccountCreate = z.infer<typeof accountCreateSchema>;
export type AccountPatch = z.infer<typeof accountPatchSchema>;

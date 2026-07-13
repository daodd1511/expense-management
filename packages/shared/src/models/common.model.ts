import { z } from "zod";

export const txTypeSchema = z.enum(["expense", "income", "transfer"]);
export type TxType = z.infer<typeof txTypeSchema>;

export const langSchema = z.enum(["vi", "en"]);
export type Lang = z.infer<typeof langSchema>;

export const accountKindSchema = z.enum(["cash", "bank", "card", "ewallet"]);
export type AccountKind = z.infer<typeof accountKindSchema>;

export const subscriptionCadenceSchema = z.enum(["monthly", "yearly"]);
export type SubscriptionCadence = z.infer<typeof subscriptionCadenceSchema>;

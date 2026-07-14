import { z } from "zod";
import { loanDirectionSchema, loanEventKindSchema, loanStatusSchema } from "../models";
import { atLeastOneKey, isoDateSchema } from "./common.dto";

export const personRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  name: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
});

export const loanRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  person_id: z.string(),
  direction: loanDirectionSchema,
  description: z.string().nullable(),
  note: z.string().nullable(),
  due_date: z.string().nullable(),
  original_date: z.string().nullable(),
  created_at: z.string(),
});

export const loanEventRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  loan_id: z.string(),
  kind: loanEventKindSchema,
  amount: z.number(),
  event_date: z.string(),
  created_at: z.string(),
});

export const personCreateSchema = z.object({
  name: z.string().trim().min(1),
  note: z.string().trim().optional(),
});

export const personPatchSchema = atLeastOneKey({
  name: z.string().trim().min(1),
  note: z.string().trim().nullable(),
});

export const loanMetadataPatchSchema = atLeastOneKey({
  description: z.string().trim().nullable(),
  note: z.string().trim().nullable(),
  dueDate: isoDateSchema.nullable(),
});

function isoTodayForValidation() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const loanFutureDateSchema = isoDateSchema.refine((value) => value <= isoTodayForValidation(), {
  message: "Loan financial event dates cannot be in the future",
});

export const disbursedLoanCreateSchema = z.object({
  personId: z.string().min(1),
  direction: loanDirectionSchema,
  description: z.string().trim().optional(),
  amount: z.number().positive(),
  accountId: z.string().min(1),
  date: loanFutureDateSchema,
  dueDate: isoDateSchema.optional(),
  note: z.string().trim().optional(),
});

export const openingLoanCreateSchema = z.object({
  personId: z.string().min(1),
  direction: loanDirectionSchema,
  description: z.string().trim().optional(),
  amount: z.number().positive(),
  balanceAsOf: isoDateSchema,
  originalDate: isoDateSchema.optional(),
  dueDate: isoDateSchema.optional(),
  note: z.string().trim().optional(),
});

export const loanDisbursementPatchSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  date: loanFutureDateSchema,
});

export const loanRepaymentCreateSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  date: loanFutureDateSchema,
});

export const loanRepaymentPatchSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  date: loanFutureDateSchema,
});

export const closeLoanSchema = z.object({
  kind: z.enum(["write_off", "forgiveness"]),
  date: loanFutureDateSchema,
});

/** List-view row: a loan plus its event-derived fields and the owning Person's name. */
export const loanSummarySchema = z.object({
  id: z.string(),
  personId: z.string(),
  personName: z.string(),
  direction: loanDirectionSchema,
  description: z.string().optional(),
  note: z.string().optional(),
  dueDate: z.string().optional(),
  originalDate: z.string().optional(),
  originAmount: z.number(),
  outstandingBalance: z.number(),
  status: loanStatusSchema,
});

/** Detail-view row: a loan summary plus full chronological event history. */
export const loanDetailSchema = loanSummarySchema.extend({
  events: z.array(
    z.object({
      id: z.string(),
      loanId: z.string(),
      kind: loanEventKindSchema,
      amount: z.number(),
      date: z.string(),
    }),
  ),
});

/** Person-level aggregate for the Loans page's person-first list. */
export const personSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string().optional(),
  lendingTotal: z.number(),
  borrowingTotal: z.number(),
  netPosition: z.number(),
  openCount: z.number(),
  overdueCount: z.number(),
});

/** Lightweight transaction-history lookup; avoids fetching every loan detail per row. */
export const loanEventLinkSchema = z.object({
  eventId: z.string(),
  loanId: z.string(),
  kind: loanEventKindSchema,
  direction: loanDirectionSchema,
  personName: z.string(),
});

export type PersonRow = z.infer<typeof personRowSchema>;
export type LoanRow = z.infer<typeof loanRowSchema>;
export type LoanEventRow = z.infer<typeof loanEventRowSchema>;
export type PersonCreate = z.infer<typeof personCreateSchema>;
export type PersonPatch = z.infer<typeof personPatchSchema>;
export type LoanMetadataPatch = z.infer<typeof loanMetadataPatchSchema>;
export type DisbursedLoanCreate = z.infer<typeof disbursedLoanCreateSchema>;
export type OpeningLoanCreate = z.infer<typeof openingLoanCreateSchema>;
export type LoanDisbursementPatch = z.infer<typeof loanDisbursementPatchSchema>;
export type LoanRepaymentCreate = z.infer<typeof loanRepaymentCreateSchema>;
export type LoanRepaymentPatch = z.infer<typeof loanRepaymentPatchSchema>;
export type CloseLoan = z.infer<typeof closeLoanSchema>;
export type LoanSummary = Readonly<z.infer<typeof loanSummarySchema>>;
export type LoanDetail = Readonly<z.infer<typeof loanDetailSchema>>;
export type PersonSummary = Readonly<z.infer<typeof personSummarySchema>>;
export type LoanEventLink = Readonly<z.infer<typeof loanEventLinkSchema>>;

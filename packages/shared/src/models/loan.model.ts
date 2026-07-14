import { z } from "zod";

export const loanDirectionSchema = z.enum(["lending", "borrowing"]);
export type LoanDirection = z.infer<typeof loanDirectionSchema>;

export const loanEventKindSchema = z.enum([
  "disbursement",
  "opening",
  "repayment",
  "write_off",
  "forgiveness",
]);
export type LoanEventKind = z.infer<typeof loanEventKindSchema>;

export const loanCashFlowDirectionSchema = z.enum(["inflow", "outflow"]);
export type LoanCashFlowDirection = z.infer<typeof loanCashFlowDirectionSchema>;

/** Derived from event history — never a stored, directly mutable field. */
export const loanStatusSchema = z.enum([
  "open",
  "due-soon",
  "overdue",
  "repaid",
  "written-off",
  "forgiven",
]);
export type LoanStatus = z.infer<typeof loanStatusSchema>;

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string().optional(),
});
export type Person = Readonly<z.infer<typeof personSchema>>;

export const loanEventSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  kind: loanEventKindSchema,
  amount: z.number(),
  date: z.string(),
});
export type LoanEvent = Readonly<z.infer<typeof loanEventSchema>>;

export const loanSchema = z.object({
  id: z.string(),
  personId: z.string(),
  direction: loanDirectionSchema,
  description: z.string().optional(),
  note: z.string().optional(),
  dueDate: z.string().optional(),
  originalDate: z.string().optional(),
});
export type Loan = Readonly<z.infer<typeof loanSchema>>;

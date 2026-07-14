import {
  closeLoanSchema,
  disbursedLoanCreateSchema,
  isoDateSchema,
  loanDisbursementPatchSchema,
  loanMetadataPatchSchema,
  loanRepaymentCreateSchema,
  loanRepaymentPatchSchema,
  openingLoanCreateSchema,
  personCreateSchema,
  personPatchSchema,
} from "@wallet/shared";
import { z } from "zod";

export {
  closeLoanSchema,
  disbursedLoanCreateSchema,
  loanDisbursementPatchSchema,
  loanMetadataPatchSchema,
  loanRepaymentCreateSchema,
  loanRepaymentPatchSchema,
  openingLoanCreateSchema,
  personCreateSchema,
  personPatchSchema,
};

// `today` is the caller's local calendar date — the server has no per-user timezone, so
// due-soon/overdue status is always computed from this rather than the server's own clock
// (same rationale as subscriptions' `today` field).
export const loanListQuerySchema = z.object({ today: isoDateSchema });
export type LoanListQuery = z.infer<typeof loanListQuerySchema>;

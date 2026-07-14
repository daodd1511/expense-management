import { z } from "zod";
import { apiJson } from "@/core/api";
import {
  loanDetailSchema,
  loanEventLinkSchema,
  loanSummarySchema,
  personSchema,
  personSummarySchema,
  type CloseLoan,
  type DisbursedLoanCreate,
  type LoanDetail,
  type LoanEventLink,
  type LoanDisbursementPatch,
  type LoanMetadataPatch,
  type LoanRepaymentCreate,
  type LoanRepaymentPatch,
  type LoanSummary,
  type OpeningLoanCreate,
  type Person,
  type PersonCreate,
  type PersonPatch,
  type PersonSummary,
} from "@wallet/shared";

const peopleResponseSchema = z.object({ data: z.array(personSchema) });
const personResponseSchema = z.object({ data: personSchema });
const loanSummariesResponseSchema = z.object({ data: z.array(loanSummarySchema) });
const personSummariesResponseSchema = z.object({ data: z.array(personSummarySchema) });
const loanDetailResponseSchema = z.object({ data: loanDetailSchema });
const loanEventLinksResponseSchema = z.object({ data: z.array(loanEventLinkSchema) });
const okResponseSchema = z.object({ ok: z.literal(true) });

function withToday(path: string, today: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${new URLSearchParams({ today }).toString()}`;
}

function jsonBody(method: "POST" | "PATCH", body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export async function fetchPeople(): Promise<Person[]> {
  const response = await apiJson("/people", peopleResponseSchema);
  return response.data;
}

export async function insertPerson(input: PersonCreate): Promise<Person> {
  const response = await apiJson("/people", personResponseSchema, jsonBody("POST", input));
  return response.data;
}

export async function patchPerson(id: string, patch: PersonPatch): Promise<Person> {
  const response = await apiJson(
    `/people/${encodeURIComponent(id)}`,
    personResponseSchema,
    jsonBody("PATCH", patch),
  );
  return response.data;
}

export async function deletePerson(id: string): Promise<void> {
  await apiJson(`/people/${encodeURIComponent(id)}`, okResponseSchema, { method: "DELETE" });
}

export async function fetchLoanSummaries(today: string): Promise<LoanSummary[]> {
  const response = await apiJson(withToday("/loans", today), loanSummariesResponseSchema);
  return response.data;
}

export async function fetchPersonSummaries(today: string): Promise<PersonSummary[]> {
  const response = await apiJson(
    withToday("/loans/people-summary", today),
    personSummariesResponseSchema,
  );
  return response.data;
}

export async function fetchLoanDetail(id: string, today: string): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(`/loans/${encodeURIComponent(id)}`, today),
    loanDetailResponseSchema,
  );
  return response.data;
}

export async function fetchLoanEventLinks(): Promise<LoanEventLink[]> {
  const response = await apiJson("/loans/event-links", loanEventLinksResponseSchema);
  return response.data;
}

export async function insertDisbursedLoan(
  input: DisbursedLoanCreate,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday("/loans/disbursed", today),
    loanDetailResponseSchema,
    jsonBody("POST", input),
  );
  return response.data;
}

export async function insertOpeningLoan(
  input: OpeningLoanCreate,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday("/loans/opening", today),
    loanDetailResponseSchema,
    jsonBody("POST", input),
  );
  return response.data;
}

export async function patchLoanMetadata(
  id: string,
  patch: LoanMetadataPatch,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(`/loans/${encodeURIComponent(id)}`, today),
    loanDetailResponseSchema,
    jsonBody("PATCH", patch),
  );
  return response.data;
}

export async function patchLoanDisbursement(
  id: string,
  patch: LoanDisbursementPatch,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(`/loans/${encodeURIComponent(id)}/disbursement`, today),
    loanDetailResponseSchema,
    jsonBody("PATCH", patch),
  );
  return response.data;
}

export async function deleteLoan(id: string): Promise<void> {
  await apiJson(`/loans/${encodeURIComponent(id)}`, okResponseSchema, { method: "DELETE" });
}

export async function insertLoanRepayment(
  loanId: string,
  input: LoanRepaymentCreate,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(`/loans/${encodeURIComponent(loanId)}/repayments`, today),
    loanDetailResponseSchema,
    jsonBody("POST", input),
  );
  return response.data;
}

export async function patchLoanRepayment(
  loanId: string,
  eventId: string,
  patch: LoanRepaymentPatch,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(
      `/loans/${encodeURIComponent(loanId)}/repayments/${encodeURIComponent(eventId)}`,
      today,
    ),
    loanDetailResponseSchema,
    jsonBody("PATCH", patch),
  );
  return response.data;
}

export async function deleteLoanRepayment(loanId: string, eventId: string): Promise<void> {
  await apiJson(
    `/loans/${encodeURIComponent(loanId)}/repayments/${encodeURIComponent(eventId)}`,
    okResponseSchema,
    { method: "DELETE" },
  );
}

export async function closeLoan(
  loanId: string,
  input: CloseLoan,
  today: string,
): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(`/loans/${encodeURIComponent(loanId)}/close`, today),
    loanDetailResponseSchema,
    jsonBody("POST", input),
  );
  return response.data;
}

export async function reopenLoan(loanId: string, today: string): Promise<LoanDetail> {
  const response = await apiJson(
    withToday(`/loans/${encodeURIComponent(loanId)}/reopen`, today),
    loanDetailResponseSchema,
    { method: "POST" },
  );
  return response.data;
}

import type { Context } from "hono";
import type { AuthEnv } from "../../middleware/auth";
import type { LoanListQuery } from "./schema";
import * as service from "./service";

function requireId(id: string | undefined) {
  if (!id) {
    throw new Error("Missing route param: id");
  }
  return id;
}

// ---- People ----

export async function listPeople(c: Context<AuthEnv>) {
  return c.json({ data: await service.listPeople(c.get("userId")) });
}

export async function createPerson(
  userId: string,
  input: Parameters<typeof service.createPerson>[1],
) {
  return service.createPerson(userId, input);
}

export async function updatePerson(
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updatePerson>[2],
) {
  return service.updatePerson(userId, requireId(id), input);
}

export async function deletePerson(c: Context<AuthEnv>) {
  await service.deletePerson(c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}

// ---- Loans (reads) ----

export async function listLoanSummaries(c: Context<AuthEnv>, query: LoanListQuery) {
  return c.json({ data: await service.listLoanSummaries(c.get("userId"), query.today) });
}

export async function listPersonSummaries(c: Context<AuthEnv>, query: LoanListQuery) {
  return c.json({ data: await service.listPersonSummaries(c.get("userId"), query.today) });
}

export async function listLoanEventLinks(c: Context<AuthEnv>) {
  return c.json({ data: await service.listLoanEventLinks(c.get("userId")) });
}

export async function getLoanDetail(c: Context<AuthEnv>, query: LoanListQuery) {
  const data = await service.getLoanDetail(
    c.get("userId"),
    requireId(c.req.param("id")),
    query.today,
  );
  return c.json({ data });
}

// ---- Loans (lifecycle) ----

export async function createDisbursedLoan(
  userId: string,
  input: Parameters<typeof service.createDisbursedLoan>[1],
  today: string,
) {
  return service.createDisbursedLoan(userId, input, today);
}

export async function createOpeningLoan(
  userId: string,
  input: Parameters<typeof service.createOpeningLoan>[1],
  today: string,
) {
  return service.createOpeningLoan(userId, input, today);
}

export async function updateLoanMetadata(
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updateLoanMetadata>[2],
  today: string,
) {
  return service.updateLoanMetadata(userId, requireId(id), input, today);
}

export async function updateLoanDisbursement(
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updateLoanDisbursement>[2],
  today: string,
) {
  return service.updateLoanDisbursement(userId, requireId(id), input, today);
}

export async function deleteLoan(c: Context<AuthEnv>) {
  await service.deleteLoan(c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}

export async function createLoanRepayment(
  userId: string,
  loanId: string | undefined,
  input: Parameters<typeof service.createLoanRepayment>[2],
  today: string,
) {
  return service.createLoanRepayment(userId, requireId(loanId), input, today);
}

export async function updateLoanRepayment(
  userId: string,
  loanId: string | undefined,
  eventId: string | undefined,
  input: Parameters<typeof service.updateLoanRepayment>[3],
  today: string,
) {
  return service.updateLoanRepayment(userId, requireId(loanId), requireId(eventId), input, today);
}

export async function deleteLoanRepayment(c: Context<AuthEnv>) {
  await service.deleteLoanRepayment(
    c.get("userId"),
    requireId(c.req.param("id")),
    requireId(c.req.param("eventId")),
  );
  return c.json({ ok: true });
}

export async function closeLoan(
  userId: string,
  loanId: string | undefined,
  input: Parameters<typeof service.closeLoan>[2],
  today: string,
) {
  return service.closeLoan(userId, requireId(loanId), input, today);
}

export async function reopenLoan(c: Context<AuthEnv>, query: LoanListQuery) {
  const data = await service.reopenLoan(c.get("userId"), requireId(c.req.param("id")), query.today);
  return c.json({ data });
}

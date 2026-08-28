import type { Context } from "hono";
import type { AppDb } from "../../db/database";
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
  return c.json({ data: await service.listPeople(c.get("db"), c.get("userId")) });
}

export async function createPerson(
  db: AppDb,
  userId: string,
  input: Parameters<typeof service.createPerson>[2],
) {
  return service.createPerson(db, userId, input);
}

export async function updatePerson(
  db: AppDb,
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updatePerson>[3],
) {
  return service.updatePerson(db, userId, requireId(id), input);
}

export async function deletePerson(c: Context<AuthEnv>) {
  await service.deletePerson(c.get("db"), c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}

// ---- Loans (reads) ----

export async function listLoanSummaries(c: Context<AuthEnv>, query: LoanListQuery) {
  return c.json({
    data: await service.listLoanSummaries(c.get("db"), c.get("userId"), query.today),
  });
}

export async function listPersonSummaries(c: Context<AuthEnv>, query: LoanListQuery) {
  return c.json({
    data: await service.listPersonSummaries(c.get("db"), c.get("userId"), query.today),
  });
}

export async function listLoanEventLinks(c: Context<AuthEnv>) {
  return c.json({ data: await service.listLoanEventLinks(c.get("db"), c.get("userId")) });
}

export async function getLoanDetail(c: Context<AuthEnv>, query: LoanListQuery) {
  const data = await service.getLoanDetail(
    c.get("db"),
    c.get("userId"),
    requireId(c.req.param("id")),
    query.today,
  );
  return c.json({ data });
}

// ---- Loans (lifecycle) ----

export async function createDisbursedLoan(
  db: AppDb,
  userId: string,
  input: Parameters<typeof service.createDisbursedLoan>[2],
  today: string,
) {
  return service.createDisbursedLoan(db, userId, input, today);
}

export async function createOpeningLoan(
  db: AppDb,
  userId: string,
  input: Parameters<typeof service.createOpeningLoan>[2],
  today: string,
) {
  return service.createOpeningLoan(db, userId, input, today);
}

export async function updateLoanMetadata(
  db: AppDb,
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updateLoanMetadata>[3],
  today: string,
) {
  return service.updateLoanMetadata(db, userId, requireId(id), input, today);
}

export async function updateLoanDisbursement(
  db: AppDb,
  userId: string,
  id: string | undefined,
  input: Parameters<typeof service.updateLoanDisbursement>[3],
  today: string,
) {
  return service.updateLoanDisbursement(db, userId, requireId(id), input, today);
}

export async function deleteLoan(c: Context<AuthEnv>) {
  await service.deleteLoan(c.get("db"), c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}

export async function createLoanRepayment(
  db: AppDb,
  userId: string,
  loanId: string | undefined,
  input: Parameters<typeof service.createLoanRepayment>[3],
  today: string,
) {
  return service.createLoanRepayment(db, userId, requireId(loanId), input, today);
}

export async function updateLoanRepayment(
  db: AppDb,
  userId: string,
  loanId: string | undefined,
  eventId: string | undefined,
  input: Parameters<typeof service.updateLoanRepayment>[4],
  today: string,
) {
  return service.updateLoanRepayment(
    db,
    userId,
    requireId(loanId),
    requireId(eventId),
    input,
    today,
  );
}

export async function deleteLoanRepayment(c: Context<AuthEnv>) {
  await service.deleteLoanRepayment(
    c.get("db"),
    c.get("userId"),
    requireId(c.req.param("id")),
    requireId(c.req.param("eventId")),
  );
  return c.json({ ok: true });
}

export async function closeLoan(
  db: AppDb,
  userId: string,
  loanId: string | undefined,
  input: Parameters<typeof service.closeLoan>[3],
  today: string,
) {
  return service.closeLoan(db, userId, requireId(loanId), input, today);
}

export async function reopenLoan(c: Context<AuthEnv>, query: LoanListQuery) {
  const data = await service.reopenLoan(
    c.get("db"),
    c.get("userId"),
    requireId(c.req.param("id")),
    query.today,
  );
  return c.json({ data });
}

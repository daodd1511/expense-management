import {
  computeLoanState,
  type CloseLoan,
  type DisbursedLoanCreate,
  type Loan,
  type LoanDetail,
  type LoanDisbursementPatch,
  type LoanEvent,
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
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

function buildLoanSummary(
  loan: Loan,
  personName: string,
  events: LoanEvent[],
  todayIso: string,
): LoanSummary {
  const state = computeLoanState(loan, events, todayIso);
  return {
    id: loan.id,
    personId: loan.personId,
    personName,
    direction: loan.direction,
    description: loan.description,
    note: loan.note,
    dueDate: loan.dueDate,
    originalDate: loan.originalDate,
    originAmount: state.originAmount,
    outstandingBalance: state.outstandingBalance,
    status: state.status,
  };
}

function buildLoanDetail(
  loan: Loan,
  personName: string,
  events: LoanEvent[],
  todayIso: string,
): LoanDetail {
  return { ...buildLoanSummary(loan, personName, events, todayIso), events };
}

/** Fetches a loan's current state fresh from the ledger — used after every mutation, since
 * outstanding balance/status are derived from the full event history, not just the one
 * event that just changed. */
async function refetchLoanDetail(
  userId: string,
  loanId: string,
  todayIso: string,
): Promise<LoanDetail> {
  const loan = await repository.loadLoan(userId, loanId);
  if (!loan) {
    throw new ApiError(404, "Loan not found");
  }

  const [person, events] = await Promise.all([
    repository.loadPerson(userId, loan.personId),
    repository.listEventsForLoans(userId, [loanId]),
  ]);

  return buildLoanDetail(loan, person?.name ?? "", events, todayIso);
}

async function loanListContext(userId: string) {
  const [loans, people] = await Promise.all([
    repository.listLoans(userId),
    repository.listPeople(userId),
  ]);
  const personNameById = new Map(people.map((person) => [person.id, person.name]));
  const events = await repository.listEventsForLoans(
    userId,
    loans.map((loan) => loan.id),
  );
  const eventsByLoanId = new Map<string, LoanEvent[]>();
  for (const event of events) {
    const list = eventsByLoanId.get(event.loanId) ?? [];
    list.push(event);
    eventsByLoanId.set(event.loanId, list);
  }

  return { loans, people, personNameById, eventsByLoanId };
}

// ---- People ----

export async function listPeople(userId: string): Promise<Person[]> {
  return repository.listPeople(userId);
}

export async function createPerson(userId: string, input: PersonCreate): Promise<Person> {
  return repository.createPerson(userId, { name: input.name, note: input.note });
}

export async function updatePerson(
  userId: string,
  id: string,
  patch: PersonPatch,
): Promise<Person> {
  const person = await repository.updatePerson(userId, id, patch);
  if (!person) {
    throw new ApiError(404, "Person not found");
  }
  return person;
}

export async function deletePerson(userId: string, id: string): Promise<void> {
  const deleted = await repository.deletePerson(userId, id);
  if (!deleted) {
    throw new ApiError(404, "Person not found");
  }
}

// ---- Loans (reads) ----

export async function listLoanSummaries(userId: string, todayIso: string): Promise<LoanSummary[]> {
  const { loans, personNameById, eventsByLoanId } = await loanListContext(userId);
  return loans.map((loan) =>
    buildLoanSummary(
      loan,
      personNameById.get(loan.personId) ?? "",
      eventsByLoanId.get(loan.id) ?? [],
      todayIso,
    ),
  );
}

export async function listPersonSummaries(
  userId: string,
  todayIso: string,
): Promise<PersonSummary[]> {
  const { loans, people, personNameById, eventsByLoanId } = await loanListContext(userId);
  const summariesByPersonId = new Map<string, LoanSummary[]>();
  for (const loan of loans) {
    const summary = buildLoanSummary(
      loan,
      personNameById.get(loan.personId) ?? "",
      eventsByLoanId.get(loan.id) ?? [],
      todayIso,
    );
    const list = summariesByPersonId.get(loan.personId) ?? [];
    list.push(summary);
    summariesByPersonId.set(loan.personId, list);
  }

  return people.map((person) => {
    const personLoans = summariesByPersonId.get(person.id) ?? [];
    const lendingTotal = personLoans
      .filter((loan) => loan.direction === "lending")
      .reduce((sum, loan) => sum + loan.outstandingBalance, 0);
    const borrowingTotal = personLoans
      .filter((loan) => loan.direction === "borrowing")
      .reduce((sum, loan) => sum + loan.outstandingBalance, 0);
    const openStatuses = new Set(["open", "due-soon", "overdue"]);

    return {
      id: person.id,
      name: person.name,
      note: person.note,
      lendingTotal,
      borrowingTotal,
      netPosition: lendingTotal - borrowingTotal,
      openCount: personLoans.filter((loan) => openStatuses.has(loan.status)).length,
      overdueCount: personLoans.filter((loan) => loan.status === "overdue").length,
    };
  });
}

export async function getLoanDetail(
  userId: string,
  id: string,
  todayIso: string,
): Promise<LoanDetail> {
  return refetchLoanDetail(userId, id, todayIso);
}

// ---- Loans (lifecycle) ----

export async function createDisbursedLoan(
  userId: string,
  input: DisbursedLoanCreate,
  todayIso: string,
): Promise<LoanDetail> {
  const { loan, event } = await repository.createDisbursedLoan({
    userId,
    personId: input.personId,
    direction: input.direction,
    description: input.description ?? null,
    amount: input.amount,
    accountId: input.accountId,
    eventDate: input.date,
    dueDate: input.dueDate ?? null,
    note: input.note ?? null,
  });
  const person = await repository.loadPerson(userId, loan.personId);
  return buildLoanDetail(loan, person?.name ?? "", [event], todayIso);
}

export async function createOpeningLoan(
  userId: string,
  input: OpeningLoanCreate,
  todayIso: string,
): Promise<LoanDetail> {
  const { loan, event } = await repository.createOpeningLoan({
    userId,
    personId: input.personId,
    direction: input.direction,
    description: input.description ?? null,
    amount: input.amount,
    balanceAsOf: input.balanceAsOf,
    originalDate: input.originalDate ?? null,
    dueDate: input.dueDate ?? null,
    note: input.note ?? null,
  });
  const person = await repository.loadPerson(userId, loan.personId);
  return buildLoanDetail(loan, person?.name ?? "", [event], todayIso);
}

export async function updateLoanMetadata(
  userId: string,
  id: string,
  patch: LoanMetadataPatch,
  todayIso: string,
): Promise<LoanDetail> {
  const loan = await repository.updateLoanMetadata(userId, id, patch);
  if (!loan) {
    throw new ApiError(404, "Loan not found");
  }
  return refetchLoanDetail(userId, id, todayIso);
}

export async function updateLoanDisbursement(
  userId: string,
  id: string,
  patch: LoanDisbursementPatch,
  todayIso: string,
): Promise<LoanDetail> {
  await repository.updateLoanDisbursement({
    userId,
    loanId: id,
    amount: patch.amount,
    accountId: patch.accountId,
    eventDate: patch.date,
  });
  return refetchLoanDetail(userId, id, todayIso);
}

export async function deleteLoan(userId: string, id: string): Promise<void> {
  const deleted = await repository.deleteLoan(userId, id);
  if (!deleted) {
    throw new ApiError(404, "Loan not found");
  }
}

export async function createLoanRepayment(
  userId: string,
  loanId: string,
  input: LoanRepaymentCreate,
  todayIso: string,
): Promise<LoanDetail> {
  await repository.createLoanRepayment({
    userId,
    loanId,
    amount: input.amount,
    accountId: input.accountId,
    eventDate: input.date,
  });
  return refetchLoanDetail(userId, loanId, todayIso);
}

export async function updateLoanRepayment(
  userId: string,
  loanId: string,
  eventId: string,
  patch: LoanRepaymentPatch,
  todayIso: string,
): Promise<LoanDetail> {
  await repository.updateLoanRepayment({
    userId,
    eventId,
    amount: patch.amount,
    accountId: patch.accountId,
    eventDate: patch.date,
  });
  return refetchLoanDetail(userId, loanId, todayIso);
}

export async function deleteLoanRepayment(
  userId: string,
  loanId: string,
  eventId: string,
): Promise<void> {
  const deleted = await repository.deleteLoanRepayment(userId, loanId, eventId);
  if (!deleted) {
    throw new ApiError(404, "Repayment not found");
  }
}

export async function closeLoan(
  userId: string,
  loanId: string,
  input: CloseLoan,
  todayIso: string,
): Promise<LoanDetail> {
  await repository.closeLoan({
    userId,
    loanId,
    kind: input.kind,
    eventDate: input.date,
  });
  return refetchLoanDetail(userId, loanId, todayIso);
}

export async function reopenLoan(
  userId: string,
  loanId: string,
  todayIso: string,
): Promise<LoanDetail> {
  const reopened = await repository.reopenLoan(userId, loanId);
  if (!reopened) {
    throw new ApiError(404, "Loan is not closed");
  }
  return refetchLoanDetail(userId, loanId, todayIso);
}

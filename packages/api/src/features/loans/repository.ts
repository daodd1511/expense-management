import {
  fromPerson,
  loanEventRowSchema,
  loanMetadataPatchToRow,
  loanRowSchema,
  personPatchToRow,
  personRowSchema,
  toLoan,
  toLoanEvent,
  toPerson,
  type Database,
  type Loan,
  type LoanEvent,
  type LoanMetadataPatch,
  type Person,
  type PersonPatch,
} from "@wallet/shared";
import { sql } from "kysely";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

type CreateDisbursedLoanRpcRow =
  Database["public"]["Functions"]["create_disbursed_loan"]["Returns"][number];
type CreateOpeningLoanRpcRow =
  Database["public"]["Functions"]["create_opening_loan"]["Returns"][number];
type CreateLoanRepaymentRpcRow =
  Database["public"]["Functions"]["create_loan_repayment"]["Returns"][number];
type UpdateLoanRepaymentRpcRow =
  Database["public"]["Functions"]["update_loan_repayment"]["Returns"][number];
type UpdateLoanDisbursementRpcRow =
  Database["public"]["Functions"]["update_loan_disbursement"]["Returns"][number];
type CloseLoanRpcRow = Database["public"]["Functions"]["close_loan"]["Returns"][number];

function parsePersonRow(data: unknown, message: string): Person {
  const result = personRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toPerson(result.data);
}

function parseLoanRow(data: unknown, message: string): Loan {
  const result = loanRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toLoan(result.data);
}

function parseLoanEventFromRpcRow(
  row: {
    event_id: string;
    event_owner_id: string;
    event_loan_id: string;
    event_kind: string;
    event_amount: number;
    event_event_date: string;
    event_created_at: string;
  },
  message: string,
): LoanEvent {
  const result = loanEventRowSchema.safeParse({
    id: row.event_id,
    owner_id: row.event_owner_id,
    loan_id: row.event_loan_id,
    kind: row.event_kind,
    amount: row.event_amount,
    event_date: row.event_event_date,
    created_at: row.event_created_at,
  });
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toLoanEvent(result.data);
}

function parseLoanFromRpcRow(
  row: {
    loan_id: string;
    loan_owner_id: string;
    loan_person_id: string;
    loan_direction: string;
    loan_description: string | null;
    loan_note: string | null;
    loan_due_date: string | null;
    loan_original_date: string | null;
    loan_created_at: string;
  },
  message: string,
): Loan {
  const result = loanRowSchema.safeParse({
    id: row.loan_id,
    owner_id: row.loan_owner_id,
    person_id: row.loan_person_id,
    direction: row.loan_direction,
    description: row.loan_description,
    note: row.loan_note,
    due_date: row.loan_due_date,
    original_date: row.loan_original_date,
    created_at: row.loan_created_at,
  });
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toLoan(result.data);
}

// ---- People ----

export async function listPeople(db: AppDb, userId: string): Promise<Person[]> {
  const rows = await db
    .selectFrom("loan_people")
    .selectAll()
    .where("owner_id", "=", userId)
    .orderBy("created_at", "asc")
    .execute();

  return parseRows(rows, personRowSchema, toPerson);
}

export async function createPerson(
  db: AppDb,
  userId: string,
  person: Omit<Person, "id">,
): Promise<Person> {
  const row = await db
    .insertInto("loan_people")
    .values(fromPerson({ person, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parsePersonRow(row, "Inserted person failed validation");
}

export async function updatePerson(
  db: AppDb,
  userId: string,
  id: string,
  patch: PersonPatch,
): Promise<Person | null> {
  const row = await db
    .updateTable("loan_people")
    .set(personPatchToRow(patch))
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  return row ? parsePersonRow(row, "Updated person failed validation") : null;
}

export async function deletePerson(db: AppDb, userId: string, id: string): Promise<boolean> {
  const row = await db
    .deleteFrom("loan_people")
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

// ---- Loans + events (reads) ----

export async function listLoans(db: AppDb, userId: string): Promise<Loan[]> {
  const rows = await db
    .selectFrom("loans")
    .selectAll()
    .where("owner_id", "=", userId)
    .orderBy("created_at", "desc")
    .execute();

  return parseRows(rows, loanRowSchema, toLoan);
}

export async function listEventsForLoans(
  db: AppDb,
  userId: string,
  loanIds: string[],
): Promise<LoanEvent[]> {
  if (loanIds.length === 0) return [];

  const rows = await db
    .selectFrom("loan_events")
    .selectAll()
    .where("owner_id", "=", userId)
    .where("loan_id", "in", loanIds)
    .orderBy("event_date", "asc")
    .execute();

  return parseRows(rows, loanEventRowSchema, toLoanEvent);
}

export async function loadLoan(db: AppDb, userId: string, id: string): Promise<Loan | null> {
  const row = await db
    .selectFrom("loans")
    .selectAll()
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .executeTakeFirst();

  return row ? parseLoanRow(row, "Stored loan failed validation") : null;
}

export async function loadPerson(db: AppDb, userId: string, id: string): Promise<Person | null> {
  const row = await db
    .selectFrom("loan_people")
    .selectAll()
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .executeTakeFirst();

  return row ? parsePersonRow(row, "Stored person failed validation") : null;
}

// ---- Loan lifecycle (RPCs) ----

export async function createDisbursedLoan(
  db: AppDb,
  params: {
    userId: string;
    personId: string;
    direction: string;
    description: string | null;
    amount: number;
    accountId: string;
    eventDate: string;
    dueDate: string | null;
    note: string | null;
  },
): Promise<{ loan: Loan; event: LoanEvent }> {
  const result = await sql<CreateDisbursedLoanRpcRow>`select * from public.create_disbursed_loan(
    ${params.userId}::uuid,
    ${params.personId}::uuid,
    ${params.direction}::text,
    ${params.description}::text,
    ${params.amount}::bigint,
    ${params.accountId}::uuid,
    ${params.eventDate}::date,
    ${params.dueDate}::date,
    ${params.note}::text
  )`.execute(db);
  const row = result.rows[0];

  return {
    loan: parseLoanFromRpcRow(row, "Created loan failed validation"),
    event: parseLoanEventFromRpcRow(row, "Created loan event failed validation"),
  };
}

export async function createOpeningLoan(
  db: AppDb,
  params: {
    userId: string;
    personId: string;
    direction: string;
    description: string | null;
    amount: number;
    balanceAsOf: string;
    originalDate: string | null;
    dueDate: string | null;
    note: string | null;
  },
): Promise<{ loan: Loan; event: LoanEvent }> {
  const result = await sql<CreateOpeningLoanRpcRow>`select * from public.create_opening_loan(
    ${params.userId}::uuid,
    ${params.personId}::uuid,
    ${params.direction}::text,
    ${params.description}::text,
    ${params.amount}::bigint,
    ${params.balanceAsOf}::date,
    ${params.originalDate}::date,
    ${params.dueDate}::date,
    ${params.note}::text
  )`.execute(db);
  const row = result.rows[0];

  return {
    loan: parseLoanFromRpcRow(row, "Created loan failed validation"),
    event: parseLoanEventFromRpcRow(row, "Created loan event failed validation"),
  };
}

export async function createLoanRepayment(
  db: AppDb,
  params: {
    userId: string;
    loanId: string;
    amount: number;
    accountId: string;
    eventDate: string;
  },
): Promise<LoanEvent> {
  const result = await sql<CreateLoanRepaymentRpcRow>`select * from public.create_loan_repayment(
    ${params.userId}::uuid,
    ${params.loanId}::uuid,
    ${params.amount}::bigint,
    ${params.accountId}::uuid,
    ${params.eventDate}::date
  )`.execute(db);

  return parseLoanEventFromRpcRow(result.rows[0], "Created repayment failed validation");
}

export async function updateLoanRepayment(
  db: AppDb,
  params: {
    userId: string;
    eventId: string;
    amount: number;
    accountId: string;
    eventDate: string;
  },
): Promise<LoanEvent> {
  const result = await sql<UpdateLoanRepaymentRpcRow>`select * from public.update_loan_repayment(
    ${params.userId}::uuid,
    ${params.eventId}::uuid,
    ${params.amount}::bigint,
    ${params.accountId}::uuid,
    ${params.eventDate}::date
  )`.execute(db);

  return parseLoanEventFromRpcRow(result.rows[0], "Updated repayment failed validation");
}

export async function updateLoanDisbursement(
  db: AppDb,
  params: {
    userId: string;
    loanId: string;
    amount: number;
    accountId: string;
    eventDate: string;
  },
): Promise<LoanEvent> {
  const result =
    await sql<UpdateLoanDisbursementRpcRow>`select * from public.update_loan_disbursement(
    ${params.userId}::uuid,
    ${params.loanId}::uuid,
    ${params.amount}::bigint,
    ${params.accountId}::uuid,
    ${params.eventDate}::date
  )`.execute(db);

  return parseLoanEventFromRpcRow(result.rows[0], "Updated disbursement failed validation");
}

export async function closeLoan(
  db: AppDb,
  params: { userId: string; loanId: string; kind: string; eventDate: string },
): Promise<LoanEvent> {
  const result = await sql<CloseLoanRpcRow>`select * from public.close_loan(
    ${params.userId}::uuid,
    ${params.loanId}::uuid,
    ${params.kind}::text,
    ${params.eventDate}::date
  )`.execute(db);

  return parseLoanEventFromRpcRow(result.rows[0], "Closed loan failed validation");
}

// ---- Loan lifecycle (plain mutations — no RPC needed) ----

export async function updateLoanMetadata(
  db: AppDb,
  userId: string,
  id: string,
  patch: LoanMetadataPatch,
): Promise<Loan | null> {
  const row = await db
    .updateTable("loans")
    .set(loanMetadataPatchToRow(patch))
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  return row ? parseLoanRow(row, "Updated loan failed validation") : null;
}

/** Deletion cascades through loan_events to their linked transactions (ON DELETE CASCADE). */
export async function deleteLoan(db: AppDb, userId: string, id: string): Promise<boolean> {
  const row = await db
    .deleteFrom("loans")
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

/**
 * Reopen = delete the active closing event (write_off/forgiveness), restoring the prior
 * outstanding balance. Deletion cascades to the closing event's own linked transaction —
 * except closing events never have one, so this is a pure ledger correction.
 */
export async function reopenLoan(db: AppDb, userId: string, loanId: string): Promise<boolean> {
  const row = await db
    .deleteFrom("loan_events")
    .where("loan_id", "=", loanId)
    .where("owner_id", "=", userId)
    .where("kind", "in", ["write_off", "forgiveness"])
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

/** Deletion cascades to the repayment's own linked transaction (ON DELETE CASCADE). */
export async function deleteLoanRepayment(
  db: AppDb,
  userId: string,
  loanId: string,
  eventId: string,
): Promise<boolean> {
  const row = await db
    .deleteFrom("loan_events")
    .where("id", "=", eventId)
    .where("loan_id", "=", loanId)
    .where("owner_id", "=", userId)
    .where("kind", "=", "repayment")
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

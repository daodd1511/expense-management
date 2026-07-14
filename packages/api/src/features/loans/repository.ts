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
import { getSupabase } from "../../config/supabase";
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

export async function listPeople(userId: string): Promise<Person[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_people")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return parseRows(data, personRowSchema, toPerson);
}

export async function createPerson(userId: string, person: Omit<Person, "id">): Promise<Person> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_people")
    .insert(fromPerson({ person, ownerId: userId }))
    .select("*")
    .single();

  if (error) throw error;
  return parsePersonRow(data, "Inserted person failed validation");
}

export async function updatePerson(
  userId: string,
  id: string,
  patch: PersonPatch,
): Promise<Person | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_people")
    .update(personPatchToRow(patch))
    .eq("id", id)
    .eq("owner_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? parsePersonRow(data, "Updated person failed validation") : null;
}

export async function deletePerson(userId: string, id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_people")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

// ---- Loans + events (reads) ----

export async function listLoans(userId: string): Promise<Loan[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return parseRows(data, loanRowSchema, toLoan);
}

export async function listEventsForLoans(userId: string, loanIds: string[]): Promise<LoanEvent[]> {
  if (loanIds.length === 0) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_events")
    .select("*")
    .eq("owner_id", userId)
    .in("loan_id", loanIds)
    .order("event_date", { ascending: true });

  if (error) throw error;
  return parseRows(data, loanEventRowSchema, toLoanEvent);
}

export async function loadLoan(userId: string, id: string): Promise<Loan | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? parseLoanRow(data, "Stored loan failed validation") : null;
}

export async function loadPerson(userId: string, id: string): Promise<Person | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_people")
    .select("*")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? parsePersonRow(data, "Stored person failed validation") : null;
}

// ---- Loan lifecycle (RPCs) ----

export async function createDisbursedLoan(params: {
  userId: string;
  personId: string;
  direction: string;
  description: string | null;
  amount: number;
  accountId: string;
  eventDate: string;
  dueDate: string | null;
  note: string | null;
}): Promise<{ loan: Loan; event: LoanEvent }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("create_disbursed_loan", {
      p_owner_id: params.userId,
      p_person_id: params.personId,
      p_direction: params.direction,
      p_description: params.description as string,
      p_amount: params.amount,
      p_account_id: params.accountId,
      p_event_date: params.eventDate,
      p_due_date: params.dueDate as string,
      p_note: params.note as string,
    })
    .single<CreateDisbursedLoanRpcRow>();

  if (error) throw error;

  return {
    loan: parseLoanFromRpcRow(data, "Created loan failed validation"),
    event: parseLoanEventFromRpcRow(data, "Created loan event failed validation"),
  };
}

export async function createOpeningLoan(params: {
  userId: string;
  personId: string;
  direction: string;
  description: string | null;
  amount: number;
  balanceAsOf: string;
  originalDate: string | null;
  dueDate: string | null;
  note: string | null;
}): Promise<{ loan: Loan; event: LoanEvent }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("create_opening_loan", {
      p_owner_id: params.userId,
      p_person_id: params.personId,
      p_direction: params.direction,
      p_description: params.description as string,
      p_amount: params.amount,
      p_balance_as_of: params.balanceAsOf,
      p_original_date: params.originalDate as string,
      p_due_date: params.dueDate as string,
      p_note: params.note as string,
    })
    .single<CreateOpeningLoanRpcRow>();

  if (error) throw error;

  return {
    loan: parseLoanFromRpcRow(data, "Created loan failed validation"),
    event: parseLoanEventFromRpcRow(data, "Created loan event failed validation"),
  };
}

export async function createLoanRepayment(params: {
  userId: string;
  loanId: string;
  amount: number;
  accountId: string;
  eventDate: string;
}): Promise<LoanEvent> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("create_loan_repayment", {
      p_owner_id: params.userId,
      p_loan_id: params.loanId,
      p_amount: params.amount,
      p_account_id: params.accountId,
      p_event_date: params.eventDate,
    })
    .single<CreateLoanRepaymentRpcRow>();

  if (error) throw error;
  return parseLoanEventFromRpcRow(data, "Created repayment failed validation");
}

export async function updateLoanRepayment(params: {
  userId: string;
  eventId: string;
  amount: number;
  accountId: string;
  eventDate: string;
}): Promise<LoanEvent> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("update_loan_repayment", {
      p_owner_id: params.userId,
      p_event_id: params.eventId,
      p_amount: params.amount,
      p_account_id: params.accountId,
      p_event_date: params.eventDate,
    })
    .single<UpdateLoanRepaymentRpcRow>();

  if (error) throw error;
  return parseLoanEventFromRpcRow(data, "Updated repayment failed validation");
}

export async function updateLoanDisbursement(params: {
  userId: string;
  loanId: string;
  amount: number;
  accountId: string;
  eventDate: string;
}): Promise<LoanEvent> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("update_loan_disbursement", {
      p_owner_id: params.userId,
      p_loan_id: params.loanId,
      p_amount: params.amount,
      p_account_id: params.accountId,
      p_event_date: params.eventDate,
    })
    .single<UpdateLoanDisbursementRpcRow>();

  if (error) throw error;
  return parseLoanEventFromRpcRow(data, "Updated disbursement failed validation");
}

export async function closeLoan(params: {
  userId: string;
  loanId: string;
  kind: string;
  eventDate: string;
}): Promise<LoanEvent> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("close_loan", {
      p_owner_id: params.userId,
      p_loan_id: params.loanId,
      p_kind: params.kind,
      p_event_date: params.eventDate,
    })
    .single<CloseLoanRpcRow>();

  if (error) throw error;
  return parseLoanEventFromRpcRow(data, "Closed loan failed validation");
}

// ---- Loan lifecycle (plain mutations — no RPC needed) ----

export async function updateLoanMetadata(
  userId: string,
  id: string,
  patch: LoanMetadataPatch,
): Promise<Loan | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loans")
    .update(loanMetadataPatchToRow(patch))
    .eq("id", id)
    .eq("owner_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? parseLoanRow(data, "Updated loan failed validation") : null;
}

/** Deletion cascades through loan_events to their linked transactions (ON DELETE CASCADE). */
export async function deleteLoan(userId: string, id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loans")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/**
 * Reopen = delete the active closing event (write_off/forgiveness), restoring the prior
 * outstanding balance. Deletion cascades to the closing event's own linked transaction —
 * except closing events never have one, so this is a pure ledger correction.
 */
export async function reopenLoan(userId: string, loanId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_events")
    .delete()
    .eq("loan_id", loanId)
    .eq("owner_id", userId)
    .in("kind", ["write_off", "forgiveness"])
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

/** Deletion cascades to the repayment's own linked transaction (ON DELETE CASCADE). */
export async function deleteLoanRepayment(
  userId: string,
  loanId: string,
  eventId: string,
): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("loan_events")
    .delete()
    .eq("id", eventId)
    .eq("loan_id", loanId)
    .eq("owner_id", userId)
    .eq("kind", "repayment")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

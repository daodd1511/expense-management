import type { Loan, LoanEvent, Person } from "../models";
import type { LoanEventRow, LoanMetadataPatch, LoanRow, PersonPatch, PersonRow } from "../dtos";

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    note: row.note ?? undefined,
  };
}

export function fromPerson(params: { person: Omit<Person, "id">; ownerId: string }) {
  const { person, ownerId } = params;
  return {
    owner_id: ownerId,
    name: person.name,
    note: person.note ?? null,
  };
}

export function personPatchToRow(patch: PersonPatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.note !== undefined && { note: patch.note }),
  };
}

export function toLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    personId: row.person_id,
    direction: row.direction,
    description: row.description ?? undefined,
    note: row.note ?? undefined,
    dueDate: row.due_date ?? undefined,
    originalDate: row.original_date ?? undefined,
  };
}

export function loanMetadataPatchToRow(patch: LoanMetadataPatch) {
  return {
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.note !== undefined && { note: patch.note }),
    ...(patch.dueDate !== undefined && { due_date: patch.dueDate }),
  };
}

export function toLoanEvent(row: LoanEventRow): LoanEvent {
  return {
    id: row.id,
    loanId: row.loan_id,
    kind: row.kind,
    amount: row.amount,
    date: row.event_date,
  };
}

import type { Account } from "../models";
import type { AccountPatch, AccountRow } from "../dtos";

export function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalance: row.opening_balance,
  };
}

export function fromAccount(params: { account: Omit<Account, "id">; ownerId: string }) {
  const { account, ownerId } = params;
  return {
    owner_id: ownerId,
    name: account.name,
    kind: account.kind,
    opening_balance: account.openingBalance,
  };
}

export function accountPatchToRow(patch: AccountPatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.kind !== undefined && { kind: patch.kind }),
    ...(patch.openingBalance !== undefined && { opening_balance: patch.openingBalance }),
  };
}

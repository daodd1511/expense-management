import {
  computeBalance,
  type AccountCreate,
  type AccountPatch,
  type AccountReorder,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listAccounts(db: AppDb, userId: string) {
  const [accounts, transactions] = await Promise.all([
    repository.listActiveAccounts(db, userId),
    repository.listUserTransactions(db, userId),
  ]);

  return accounts.map((account) => ({
    ...account,
    balance: computeBalance(account.id, transactions, account.openingBalance),
  }));
}

export async function createAccount(db: AppDb, userId: string, account: AccountCreate) {
  return repository.createAccount(db, userId, account);
}

export async function updateAccount(db: AppDb, userId: string, id: string, patch: AccountPatch) {
  const account = await repository.updateAccount(db, userId, id, patch);
  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  return account;
}

export async function archiveAccount(db: AppDb, userId: string, id: string) {
  const archived = await repository.archiveAccount(db, userId, id);
  if (!archived) {
    throw new ApiError(404, "Account not found");
  }
}

export async function reorderAccounts(db: AppDb, userId: string, input: AccountReorder) {
  await repository.reorderAccounts(db, userId, input);
}

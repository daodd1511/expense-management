import { computeBalance, type AccountCreate, type AccountPatch } from "@wallet/shared";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

export async function listAccounts(userId: string) {
  const [accounts, transactions] = await Promise.all([
    repository.listActiveAccounts(userId),
    repository.listUserTransactions(userId),
  ]);

  return accounts.map((account) => ({
    ...account,
    balance: computeBalance(account.id, transactions, account.openingBalance),
  }));
}

export async function createAccount(userId: string, account: AccountCreate) {
  return repository.createAccount(userId, account);
}

export async function updateAccount(userId: string, id: string, patch: AccountPatch) {
  const account = await repository.updateAccount(userId, id, patch);
  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  return account;
}

export async function archiveAccount(userId: string, id: string) {
  const archived = await repository.archiveAccount(userId, id);
  if (!archived) {
    throw new ApiError(404, "Account not found");
  }
}

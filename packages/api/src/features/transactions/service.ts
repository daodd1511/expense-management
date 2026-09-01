import { z } from "zod";
import {
  computeRunningBalances,
  transactionSchema,
  type TransactionCreate,
  type TransactionPatch,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";
import { monthFilterSchema } from "./schema";

function monthBounds(month: string) {
  const [year, value] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, value - 1, 1));
  const end = new Date(Date.UTC(year, value, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function listTransactions(db: AppDb, userId: string, month?: string) {
  let start: string | undefined;
  let end: string | undefined;

  if (month !== undefined) {
    const parsedMonth = monthFilterSchema.safeParse(month);
    if (!parsedMonth.success) {
      throw new ApiError(400, "Invalid month query", z.flattenError(parsedMonth.error));
    }

    const bounds = monthBounds(parsedMonth.data);
    start = bounds.start;
    end = bounds.end;
  }

  const [openingBalances, ledgerTransactions] = await Promise.all([
    repository.listAccountOpeningBalances(db, userId),
    repository.listTransactionsForBalance(db, { userId, throughExclusive: end }),
  ]);

  const transactionsWithBalances = computeRunningBalances(ledgerTransactions, openingBalances);
  const visibleTransactions =
    start === undefined || end === undefined
      ? transactionsWithBalances
      : transactionsWithBalances.filter(
          (transaction) => transaction.date >= start && transaction.date < end,
        );

  const response = z.array(transactionSchema).safeParse(visibleTransactions.toReversed());
  if (!response.success) {
    throw new ApiError(500, "Transaction list failed validation", z.flattenError(response.error));
  }

  return response.data;
}

export async function createTransaction(db: AppDb, userId: string, transaction: TransactionCreate) {
  if (!(await repository.referencesAreAccessible(db, userId, transaction))) {
    throw new ApiError(404, "Referenced resource not found");
  }

  if (transaction.type === "transfer" && (transaction.fee ?? 0) > 0) {
    return repository.createTransferWithFee(db, userId, transaction, transaction.fee!);
  }
  return repository.createTransaction(db, userId, transaction);
}

const LOAN_LINKED_MESSAGE = "This transaction is linked to a loan. Edit or delete it from Loans.";

async function rejectIfLoanLinked(db: AppDb, userId: string, ids: string[]) {
  const linkedIds = await repository.listLoanLinkedIds(db, userId, ids);
  if (linkedIds.length > 0) {
    throw new ApiError(409, LOAN_LINKED_MESSAGE);
  }
}

export async function updateTransaction(
  db: AppDb,
  userId: string,
  id: string,
  patch: TransactionPatch,
) {
  await rejectIfLoanLinked(db, userId, [id]);
  if (!(await repository.referencesAreAccessible(db, userId, patch))) {
    throw new ApiError(404, "Referenced resource not found");
  }

  const transaction = await repository.updateTransaction(db, userId, id, patch);
  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  if (transaction.type !== "transfer") return transaction;

  const linkedFee = await repository.findLinkedTransferFee(db, userId, id);
  const fee = patch.fee;
  if (fee === 0 && linkedFee) {
    await repository.deleteTransaction(db, userId, linkedFee.id);
  } else if (linkedFee) {
    await repository.updateTransaction(db, userId, linkedFee.id, {
      ...(fee !== undefined && { amount: fee }),
      accountId: transaction.accountId,
      date: transaction.date,
    });
  } else if (fee !== undefined && fee > 0) {
    const categoryId = await repository.findTransferFeeCategoryId(db);
    await repository.createLinkedTransferFee(db, userId, {
      type: "expense",
      amount: fee,
      categoryId,
      accountId: transaction.accountId,
      toAccountId: null,
      merchant: "Transfer Fee",
      date: transaction.date,
      time: transaction.time,
      receipt: null,
      subscriptionId: null,
      linkedTransferId: id,
    });
  }

  return transaction;
}

export async function deleteTransactions(db: AppDb, userId: string, ids: string[]) {
  // Mixed selections are rejected as a whole, not partially processed (PLAN.md).
  await rejectIfLoanLinked(db, userId, ids);
  return repository.deleteTransactions(db, userId, ids);
}

export async function deleteTransaction(db: AppDb, userId: string, id: string) {
  await rejectIfLoanLinked(db, userId, [id]);

  const deleted = await repository.deleteTransaction(db, userId, id);
  if (!deleted) {
    throw new ApiError(404, "Transaction not found");
  }
}

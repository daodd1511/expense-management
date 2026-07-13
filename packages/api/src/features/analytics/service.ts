import { balanceTrendResponseSchema, computeBalanceTrend, monthFilterSchema } from "@wallet/shared";
import { z } from "zod";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

function currentMonthIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getBalanceTrend(userId: string, referenceMonthParam?: string) {
  let referenceMonth = currentMonthIso();
  if (referenceMonthParam !== undefined) {
    const parsed = monthFilterSchema.safeParse(referenceMonthParam);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid referenceMonth query", z.flattenError(parsed.error));
    }
    referenceMonth = parsed.data;
  }

  const accounts = await repository.listActiveAccounts(userId);
  const accountIds = new Set(accounts.map((account) => account.id));
  const startingBalance = accounts.reduce((sum, account) => sum + account.openingBalance, 0);

  const transactions = (await repository.listTransactions(userId)).filter((tx) =>
    accountIds.has(tx.accountId),
  );

  const response = balanceTrendResponseSchema.safeParse({
    data: computeBalanceTrend(transactions, startingBalance, referenceMonth),
  });

  if (!response.success) {
    throw new ApiError(500, "Balance trend failed validation", z.flattenError(response.error));
  }

  return response.data;
}

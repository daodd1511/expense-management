import type { BalanceTrendPoint } from "./dtos";
import type { Loan, LoanDirection, LoanEvent, LoanStatus, Transaction } from "./models";

function getBalance(balanceByAccountId: Map<string, number>, accountId: string) {
  return balanceByAccountId.get(accountId) ?? 0;
}

function setBalance(
  balanceByAccountId: Map<string, number>,
  accountId: string,
  nextBalance: number,
) {
  balanceByAccountId.set(accountId, nextBalance);
}

function applyTransaction(
  balanceByAccountId: Map<string, number>,
  transaction: Transaction,
): number {
  if (transaction.type === "income") {
    const nextBalance = getBalance(balanceByAccountId, transaction.accountId) + transaction.amount;
    setBalance(balanceByAccountId, transaction.accountId, nextBalance);
    return nextBalance;
  }

  if (transaction.type === "expense") {
    const nextBalance = getBalance(balanceByAccountId, transaction.accountId) - transaction.amount;
    setBalance(balanceByAccountId, transaction.accountId, nextBalance);
    return nextBalance;
  }

  if (transaction.type === "loan") {
    // Loan rows have no toAccountId — cashFlowDirection alone decides which way the single
    // linked account moves (see PLAN.md's Loan event -> cash direction table).
    const delta =
      transaction.cashFlowDirection === "inflow" ? transaction.amount : -transaction.amount;
    const nextBalance = getBalance(balanceByAccountId, transaction.accountId) + delta;
    setBalance(balanceByAccountId, transaction.accountId, nextBalance);
    return nextBalance;
  }

  const sourceBalance = getBalance(balanceByAccountId, transaction.accountId) - transaction.amount;
  setBalance(balanceByAccountId, transaction.accountId, sourceBalance);

  if (transaction.toAccountId) {
    const destinationBalance =
      getBalance(balanceByAccountId, transaction.toAccountId) + transaction.amount;
    setBalance(balanceByAccountId, transaction.toAccountId, destinationBalance);
  }

  return sourceBalance;
}

/** Computed balance = opening balance + all income - all expenses ± transfers. */
export function computeBalance(
  accountId: string,
  transactions: Transaction[],
  openingBalance: number,
): number {
  const balanceByAccountId = new Map<string, number>([[accountId, openingBalance]]);
  for (const tx of transactions) {
    applyTransaction(balanceByAccountId, tx);
  }
  return getBalance(balanceByAccountId, accountId);
}

export function computeRunningBalances(
  transactions: Transaction[],
  openingBalanceByAccountId: ReadonlyMap<string, number> | Record<string, number>,
): Transaction[] {
  const initialEntries =
    openingBalanceByAccountId instanceof Map
      ? openingBalanceByAccountId.entries()
      : Object.entries(openingBalanceByAccountId);
  const balanceByAccountId = new Map<string, number>(initialEntries);

  return transactions.map((transaction) => {
    const balanceAfter = applyTransaction(balanceByAccountId, transaction);
    return {
      ...transaction,
      balanceAfter,
      ...(transaction.type === "transfer" && transaction.toAccountId
        ? { toAccountBalanceAfter: getBalance(balanceByAccountId, transaction.toAccountId) }
        : {}),
    };
  });
}

function shiftMonth(monthIso: string, delta: number): string {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Cumulative net worth at the end of each of the trailing `monthsBack` months (inclusive of
 * `referenceMonth`), zero-filled for months with no activity. `startingBalance` is the sum
 * of every account's opening balance; each month's net (income − expense) is added on top,
 * carrying forward all history before the window into the first point. Transfers are
 * excluded — they move money between the same owner's accounts, so they net to zero for a
 * total-net-worth figure. `referenceMonth` is caller-supplied (`YYYY-MM`) rather than read
 * from the server's own clock, since "today" is a local-calendar-date concept with no
 * per-user timezone stored.
 */
export function computeBalanceTrend(
  transactions: Transaction[],
  startingBalance: number,
  referenceMonth: string,
  monthsBack = 6,
): BalanceTrendPoint[] {
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(shiftMonth(referenceMonth, -i));
  }

  const netByMonth = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === "transfer") continue;
    const month = tx.date.slice(0, 7);
    const delta = tx.type === "income" ? tx.amount : -tx.amount;
    netByMonth.set(month, (netByMonth.get(month) ?? 0) + delta);
  }

  const earliestWindowMonth = months[0];
  let runningBalance = startingBalance;
  for (const [month, net] of netByMonth) {
    if (month < earliestWindowMonth) runningBalance += net;
  }

  return months.map((month) => {
    runningBalance += netByMonth.get(month) ?? 0;
    return { month, balance: runningBalance };
  });
}

/**
 * Whole-day difference between two 'YYYY-MM-DD' local dates (`toIso` minus `fromIso`),
 * positive when `toIso` is later. Both inputs are already plain date strings with no time
 * or timezone component, so parsing each via Date.UTC and diffing is safe here — the
 * UTC-vs-local drift pitfall only applies when mixing a parsed date against a live "now".
 */
function diffDaysUtc(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

const LOAN_DUE_SOON_WINDOW_DAYS = 7;

function findLoanOrigin(events: LoanEvent[]): LoanEvent | undefined {
  return events.find((event) => event.kind === "disbursement" || event.kind === "opening");
}

/** Origin amount (disbursement or opening event); 0 if the origin event is missing. */
export function computeLoanOriginAmount(events: LoanEvent[]): number {
  return findLoanOrigin(events)?.amount ?? 0;
}

/**
 * Origin amount minus repayments, until a write-off or forgiveness closes the remainder
 * (then 0 — nothing more is owed, regardless of the closing event's own recorded amount).
 */
export function computeLoanOutstandingBalance(events: LoanEvent[]): number {
  const isClosed = events.some(
    (event) => event.kind === "write_off" || event.kind === "forgiveness",
  );
  if (isClosed) return 0;

  const repaid = events
    .filter((event) => event.kind === "repayment")
    .reduce((sum, event) => sum + event.amount, 0);

  return computeLoanOriginAmount(events) - repaid;
}

/** Derives status from event history and today's local date — never a stored field. */
export function computeLoanStatus(loan: Loan, events: LoanEvent[], todayIso: string): LoanStatus {
  if (events.some((event) => event.kind === "write_off")) return "written-off";
  if (events.some((event) => event.kind === "forgiveness")) return "forgiven";
  if (computeLoanOutstandingBalance(events) <= 0) return "repaid";
  if (!loan.dueDate) return "open";

  const daysUntilDue = diffDaysUtc(todayIso, loan.dueDate);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= LOAN_DUE_SOON_WINDOW_DAYS) return "due-soon";
  return "open";
}

export type LoanComputedState = {
  originAmount: number;
  outstandingBalance: number;
  status: LoanStatus;
};

/** Bundles the three event-derived fields callers building a loan summary/detail need. */
export function computeLoanState(
  loan: Loan,
  events: LoanEvent[],
  todayIso: string,
): LoanComputedState {
  return {
    originAmount: computeLoanOriginAmount(events),
    outstandingBalance: computeLoanOutstandingBalance(events),
    status: computeLoanStatus(loan, events, todayIso),
  };
}

export type FinancialPositionAccountState = {
  accountTotal: number;
  lendingOutstanding: number;
  borrowingOutstanding: number;
  netWorth: number;
};

/** Account total + lending/borrowing outstanding + net worth as of a single instant,
 * from a snapshot of transactions/loan events already filtered to that instant. */
function computeFinancialPositionBoundary(
  accounts: { id: string; openingBalance: number }[],
  transactionsThroughBoundary: Transaction[],
  loansThroughBoundary: { direction: LoanDirection; events: LoanEvent[] }[],
): FinancialPositionAccountState {
  const accountTotal = accounts.reduce(
    (sum, account) =>
      sum + computeBalance(account.id, transactionsThroughBoundary, account.openingBalance),
    0,
  );

  let lendingOutstanding = 0;
  let borrowingOutstanding = 0;
  for (const loan of loansThroughBoundary) {
    const outstanding = computeLoanOutstandingBalance(loan.events);
    if (loan.direction === "lending") lendingOutstanding += outstanding;
    else borrowingOutstanding += outstanding;
  }

  return {
    accountTotal,
    lendingOutstanding,
    borrowingOutstanding,
    netWorth: accountTotal + lendingOutstanding - borrowingOutstanding,
  };
}

export type FinancialPositionReport = {
  range: { from: string; to: string };
  opening: FinancialPositionAccountState;
  closing: FinancialPositionAccountState;
  income: number;
  expense: number;
  surplus: number;
  loanCashFlow: {
    lent: number;
    borrowed: number;
    lendingRepaymentsReceived: number;
    borrowingRepaymentsPaid: number;
    net: number;
  };
  balanceAdjustments: number;
  writeOffs: number;
  forgiveness: number;
  openingLoanAdjustments: {
    lending: number;
    borrowing: number;
  };
  reconciliation: {
    accountTotal: { expected: number; actual: number; matches: boolean };
    netWorth: { expected: number; actual: number; matches: boolean };
  };
};

const RECONCILIATION_TOLERANCE = 1;

/**
 * Financial Position report for the (from, to] window — `from` exclusive/opening,
 * `to` inclusive/closing, per PLAN.md → "Accounting and Reports". Proves both
 * reconciliation equations by computing the closing boundary two independent ways
 * (a direct snapshot, and starting boundary + period flows) and comparing them.
 *
 * Callers must pass every transaction/loan event dated on or before `to` — this
 * function derives the `from`-boundary and period-only subsets internally by date,
 * so it never needs "today" or the caller's own date-filtered queries to agree.
 */
export function computeFinancialPosition(input: {
  accounts: { id: string; openingBalance: number }[];
  transactionsThroughTo: Transaction[];
  loans: { direction: LoanDirection; events: LoanEvent[] }[];
  from: string;
  to: string;
  balanceAdjustmentTransactionIds: ReadonlySet<string>;
}): FinancialPositionReport {
  const { accounts, transactionsThroughTo, loans, from, to, balanceAdjustmentTransactionIds } =
    input;

  const transactionsThroughFrom = transactionsThroughTo.filter((tx) => tx.date <= from);
  const periodTransactions = transactionsThroughTo.filter((tx) => tx.date > from && tx.date <= to);

  const loansThroughFrom = loans.map((loan) => ({
    direction: loan.direction,
    events: loan.events.filter((event) => event.date <= from),
  }));
  const loansThroughTo = loans.map((loan) => ({
    direction: loan.direction,
    events: loan.events.filter((event) => event.date <= to),
  }));

  const opening = computeFinancialPositionBoundary(
    accounts,
    transactionsThroughFrom,
    loansThroughFrom,
  );
  const closing = computeFinancialPositionBoundary(accounts, transactionsThroughTo, loansThroughTo);

  let income = 0;
  let expense = 0;
  let balanceAdjustments = 0;
  for (const tx of periodTransactions) {
    const isAdjustment = balanceAdjustmentTransactionIds.has(tx.id);
    if (tx.type === "income") {
      if (isAdjustment) balanceAdjustments += tx.amount;
      else income += tx.amount;
    } else if (tx.type === "expense") {
      if (isAdjustment) balanceAdjustments -= tx.amount;
      else expense += tx.amount;
    }
  }
  const surplus = income - expense;

  let lent = 0;
  let borrowed = 0;
  let lendingRepaymentsReceived = 0;
  let borrowingRepaymentsPaid = 0;
  let writeOffs = 0;
  let forgiveness = 0;
  let openingLoanLending = 0;
  let openingLoanBorrowing = 0;

  for (const loan of loans) {
    for (const event of loan.events) {
      if (event.date <= from || event.date > to) continue;

      if (event.kind === "disbursement") {
        if (loan.direction === "lending") lent += event.amount;
        else borrowed += event.amount;
      } else if (event.kind === "repayment") {
        if (loan.direction === "lending") lendingRepaymentsReceived += event.amount;
        else borrowingRepaymentsPaid += event.amount;
      } else if (event.kind === "write_off") {
        writeOffs += event.amount;
      } else if (event.kind === "forgiveness") {
        forgiveness += event.amount;
      } else if (event.kind === "opening") {
        if (loan.direction === "lending") openingLoanLending += event.amount;
        else openingLoanBorrowing += event.amount;
      }
    }
  }

  // Lending disbursement/borrowing repayment move cash out; borrowing disbursement/lending
  // repayment move cash in (see PLAN.md's cash-direction table).
  const netLoanCashFlow = -lent + borrowed + lendingRepaymentsReceived - borrowingRepaymentsPaid;

  const expectedAccountTotal =
    opening.accountTotal + surplus + netLoanCashFlow + balanceAdjustments;
  const expectedNetWorth =
    opening.netWorth +
    surplus +
    balanceAdjustments +
    openingLoanLending -
    openingLoanBorrowing -
    writeOffs +
    forgiveness;

  return {
    range: { from, to },
    opening,
    closing,
    income,
    expense,
    surplus,
    loanCashFlow: {
      lent,
      borrowed,
      lendingRepaymentsReceived,
      borrowingRepaymentsPaid,
      net: netLoanCashFlow,
    },
    balanceAdjustments,
    writeOffs,
    forgiveness,
    openingLoanAdjustments: {
      lending: openingLoanLending,
      borrowing: openingLoanBorrowing,
    },
    reconciliation: {
      accountTotal: {
        expected: expectedAccountTotal,
        actual: closing.accountTotal,
        matches: Math.abs(expectedAccountTotal - closing.accountTotal) < RECONCILIATION_TOLERANCE,
      },
      netWorth: {
        expected: expectedNetWorth,
        actual: closing.netWorth,
        matches: Math.abs(expectedNetWorth - closing.netWorth) < RECONCILIATION_TOLERANCE,
      },
    },
  };
}

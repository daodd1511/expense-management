import type { Generated } from "kysely";

/**
 * Kysely schema contract for the `public` and `auth` schemas defined in
 * `db/migrations/`. Hand-written from the reviewed migrations (not generated), since
 * Dbmate's raw SQL — not this file — is the schema authority (ADR-0009): a mismatch
 * here is a bug in this file, never a signal to change the migration.
 *
 * `Generated<T>` marks a column callers may omit on insert because PostgreSQL fills it
 * (a `DEFAULT`, or the `accounts_set_display_order` trigger for `display_order`); it is
 * always present on select. `ColumnType<Select, Insert, Update>` is used where the
 * insert/update shape differs from the select shape (e.g. a `NULL`-only foreign key).
 */

export interface AccountsTable {
  id: Generated<string>;
  owner_id: string;
  name: string;
  kind: "cash" | "bank" | "card" | "ewallet";
  opening_balance: Generated<number>;
  archived: Generated<boolean>;
  created_at: Generated<string>;
  display_order: Generated<number>;
}

export interface CategoriesTable {
  id: Generated<string>;
  owner_id: string | null;
  name: string;
  icon: string;
  color: string;
  created_at: Generated<string>;
  type: "expense" | "income";
  parent_id: string | null;
  is_hidden: Generated<boolean>;
}

export interface CategoryTranslationsTable {
  id: Generated<string>;
  category_id: string;
  locale: "vi" | "en";
  name: string;
}

export interface CategoryFavoritesTable {
  id: Generated<string>;
  user_id: string;
  category_id: string;
  created_at: Generated<string>;
}

export interface BudgetsTable {
  id: Generated<string>;
  owner_id: string;
  category_id: string;
  amount: number;
  created_at: Generated<string>;
  scope: Generated<"self" | "tree">;
}

export interface LoanPeopleTable {
  id: Generated<string>;
  owner_id: string;
  name: string;
  note: string | null;
  created_at: Generated<string>;
}

export interface LoansTable {
  id: Generated<string>;
  owner_id: string;
  person_id: string;
  direction: "lending" | "borrowing";
  description: string | null;
  note: string | null;
  due_date: string | null;
  original_date: string | null;
  created_at: Generated<string>;
}

export interface LoanEventsTable {
  id: Generated<string>;
  owner_id: string;
  loan_id: string;
  kind: "disbursement" | "opening" | "repayment" | "write_off" | "forgiveness";
  amount: number;
  event_date: string;
  created_at: Generated<string>;
}

export interface SubscriptionsTable {
  id: Generated<string>;
  owner_id: string;
  name: string;
  amount: number;
  type: "expense" | "income";
  category_id: string | null;
  account_id: string;
  cadence: "monthly" | "yearly";
  day_of_month: number;
  month_of_year: number;
  next_due_date: string;
  note: string | null;
  active: Generated<boolean>;
  created_at: Generated<string>;
}

export interface TransactionsTable {
  id: Generated<string>;
  owner_id: string;
  type: "expense" | "income" | "transfer" | "loan";
  amount: number;
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  merchant: Generated<string>;
  note: string | null;
  tx_date: string;
  receipt_url: string | null;
  subscription_id: string | null;
  created_at: Generated<string>;
  tx_time: string | null;
  linked_transfer_id: string | null;
  cash_flow_direction: "inflow" | "outflow" | null;
  loan_event_id: string | null;
}

/** Better Auth's own tables (`auth` schema). Read-mostly from the API's perspective;
 * Better Auth's runtime (Phase 3) is the only writer. */
export interface AuthUserTable {
  id: Generated<string>;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Generated<string>;
  updatedAt: Generated<string>;
}

export interface DB {
  accounts: AccountsTable;
  categories: CategoriesTable;
  category_translations: CategoryTranslationsTable;
  category_favorites: CategoryFavoritesTable;
  budgets: BudgetsTable;
  loan_people: LoanPeopleTable;
  loans: LoansTable;
  loan_events: LoanEventsTable;
  subscriptions: SubscriptionsTable;
  transactions: TransactionsTable;
  "auth.user": AuthUserTable;
}

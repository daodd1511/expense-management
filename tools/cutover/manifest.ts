import { createHash } from "node:crypto";
import type { ClientBase } from "../../packages/api/src/db/pg";

export type DataRow = Record<string, unknown>;

export type IdentityRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

export const TABLE_DEFINITIONS = {
  categories: [
    "id",
    "owner_id",
    "name",
    "icon",
    "color",
    "created_at",
    "type",
    "parent_id",
    "is_hidden",
  ],
  category_translations: ["id", "category_id", "locale", "name"],
  accounts: [
    "id",
    "owner_id",
    "name",
    "kind",
    "opening_balance",
    "archived",
    "created_at",
    "display_order",
  ],
  budgets: ["id", "owner_id", "category_id", "amount", "created_at", "scope"],
  loan_people: ["id", "owner_id", "name", "note", "created_at"],
  loans: [
    "id",
    "owner_id",
    "person_id",
    "direction",
    "description",
    "note",
    "due_date",
    "original_date",
    "created_at",
  ],
  loan_events: ["id", "owner_id", "loan_id", "kind", "amount", "event_date", "created_at"],
  subscriptions: [
    "id",
    "owner_id",
    "name",
    "amount",
    "type",
    "category_id",
    "account_id",
    "cadence",
    "day_of_month",
    "month_of_year",
    "next_due_date",
    "note",
    "active",
    "created_at",
  ],
  transactions: [
    "id",
    "owner_id",
    "type",
    "amount",
    "category_id",
    "account_id",
    "to_account_id",
    "merchant",
    "note",
    "tx_date",
    "receipt_url",
    "subscription_id",
    "created_at",
    "tx_time",
    "linked_transfer_id",
    "cash_flow_direction",
    "loan_event_id",
  ],
  category_favorites: ["id", "user_id", "category_id", "created_at"],
} as const;

export type TableName = keyof typeof TABLE_DEFINITIONS;

export type CutoverDataset = {
  version: 1;
  exportedAt: string;
  identities: IdentityRow[];
  tables: Record<TableName, DataRow[]>;
};

type DigestCount = { count: number; digest: string };

export type FinancialAggregate = {
  accountBalances: Record<string, string>;
  transactionAmounts: Record<string, { count: number; amount: string }>;
  budget: { count: number; amount: string };
  subscription: { count: number; amount: string };
  categoryFavorites: number;
  loanBalances: Record<string, string>;
  loanEventAmounts: Record<string, { count: number; amount: string }>;
};

export type Manifest = {
  version: 1;
  identities: DigestCount;
  tables: Record<TableName, DigestCount & { perUser: Record<string, DigestCount> }>;
  transactionsById: Record<string, string>;
  financialByUser: Record<string, FinancialAggregate>;
};

export type CutoverArtifact = {
  dataset: CutoverDataset;
  manifest: Manifest;
};

const IDENTITY_COLUMNS = [
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  "createdAt",
  "updatedAt",
] as const;

const SYSTEM_OWNER = "_system";
const TIMESTAMPTZ_COLUMNS = new Set(["created_at", "createdAt", "updatedAt"]);
const DATE_COLUMNS = new Set([
  "due_date",
  "original_date",
  "event_date",
  "next_due_date",
  "tx_date",
]);
const TIME_COLUMNS = new Set(["tx_time"]);
const BIGINT_COLUMNS = new Set(["opening_balance", "amount"]);

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalizeValue(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

function digestRows(rows: DataRow[]): string {
  const hash = createHash("sha256");
  for (const row of [...rows].sort((left, right) => rowId(left).localeCompare(rowId(right)))) {
    hash.update(canonicalJson(row));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function rowId(row: DataRow): string {
  if (typeof row.id !== "string") throw new Error("Cutover row is missing a string id");
  return row.id;
}

function requiredString(row: DataRow, column: string): string {
  const value = row[column];
  if (typeof value !== "string")
    throw new Error(`Expected ${column} to be a string on ${rowId(row)}`);
  return value;
}

function nullableString(row: DataRow, column: string): string | null {
  const value = row[column];
  if (value === null) return null;
  if (typeof value !== "string")
    throw new Error(`Expected ${column} to be a string or null on ${rowId(row)}`);
  return value;
}

function integerValue(row: DataRow, column: string): bigint {
  const value = row[column];
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new Error(`Expected ${column} to be an integer on ${rowId(row)}`);
  }
  return BigInt(value);
}

function normalizeRows(rows: DataRow[], columns: readonly string[]): DataRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      columns.map((column) => {
        if (!(column in row)) throw new Error(`Database row is missing ${column}`);
        return [column, normalizeValue(row[column])];
      }),
    ),
  );
}

async function readRows(
  client: ClientBase,
  schema: string,
  table: string,
  columns: readonly string[],
): Promise<DataRow[]> {
  const selected = columns
    .map((column) => {
      const identifier = quoteIdentifier(column);
      if (TIMESTAMPTZ_COLUMNS.has(column)) {
        return `to_char(${identifier} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as ${identifier}`;
      }
      if (DATE_COLUMNS.has(column) || TIME_COLUMNS.has(column) || BIGINT_COLUMNS.has(column)) {
        return `${identifier}::text as ${identifier}`;
      }
      return identifier;
    })
    .join(", ");
  const result = await client.query<DataRow>(
    `select ${selected} from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} order by ${quoteIdentifier("id")}`,
  );
  return normalizeRows(result.rows, columns);
}

async function readApplicationTables(client: ClientBase): Promise<Record<TableName, DataRow[]>> {
  const entries: [TableName, DataRow[]][] = [];
  for (const [table, columns] of Object.entries(TABLE_DEFINITIONS) as [
    TableName,
    readonly string[],
  ][]) {
    entries.push([table, await readRows(client, "public", table, columns)]);
  }
  return Object.fromEntries(entries) as Record<TableName, DataRow[]>;
}

export async function readDataset(client: ClientBase): Promise<CutoverDataset> {
  const identities = (await readRows(client, "auth", "user", IDENTITY_COLUMNS)) as IdentityRow[];
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    identities,
    tables: await readApplicationTables(client),
  };
}

export async function readSupabaseDataset(client: ClientBase): Promise<CutoverDataset> {
  const result = await client.query<IdentityRow>(`
    select
      id::text as id,
      lower(trim(email)) as name,
      lower(trim(email)) as email,
      (email_confirmed_at is not null) as "emailVerified",
      null::text as image,
      to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt",
      to_char(coalesce(updated_at, created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "updatedAt"
    from auth.users
    where email is not null
    order by id
  `);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    identities: result.rows,
    tables: await readApplicationTables(client),
  };
}

function rowsById(rows: DataRow[]): Map<string, DataRow> {
  const result = new Map<string, DataRow>();
  for (const row of rows) {
    const id = rowId(row);
    if (result.has(id)) throw new Error(`Duplicate row id ${id}`);
    result.set(id, row);
  }
  return result;
}

function requireReference(
  row: DataRow,
  column: string,
  target: Map<string, DataRow>,
  nullable = false,
): DataRow | null {
  const id = nullable ? nullableString(row, column) : requiredString(row, column);
  if (id === null) return null;
  const referenced = target.get(id);
  if (!referenced) throw new Error(`${rowId(row)} has orphaned ${column} ${id}`);
  return referenced;
}

function assertSameOwner(row: DataRow, referenced: DataRow, ownerColumn = "owner_id"): void {
  const owner = nullableString(row, ownerColumn);
  const referencedOwner = nullableString(referenced, "owner_id");
  if (referencedOwner !== null && referencedOwner !== owner) {
    throw new Error(`${rowId(row)} references a row owned by another User`);
  }
}

export function validateDatasetInvariants(dataset: CutoverDataset): void {
  if (dataset.version !== 1) throw new Error("Unsupported cutover dataset version");
  const identities = new Set(dataset.identities.map((identity) => identity.id));
  if (identities.size !== dataset.identities.length) throw new Error("Duplicate identity id");
  for (const identity of dataset.identities) {
    const actual = Object.keys(identity).sort();
    const expected = [...IDENTITY_COLUMNS].sort();
    if (canonicalJson(actual) !== canonicalJson(expected)) {
      throw new Error(`Identity ${identity.id} contains missing or unsafe fields`);
    }
    if (identity.email !== identity.email.trim().toLowerCase()) {
      throw new Error(`Identity ${identity.id} has a non-normalized email`);
    }
  }

  const tables = Object.fromEntries(
    (Object.keys(TABLE_DEFINITIONS) as TableName[]).map((table) => [
      table,
      rowsById(dataset.tables[table]),
    ]),
  ) as Record<TableName, Map<string, DataRow>>;

  for (const table of Object.keys(TABLE_DEFINITIONS) as TableName[]) {
    for (const row of dataset.tables[table]) {
      const columns = Object.keys(row).sort();
      const expected = [...TABLE_DEFINITIONS[table]].sort();
      if (canonicalJson(columns) !== canonicalJson(expected)) {
        throw new Error(`${table}.${rowId(row)} has an unexpected column set`);
      }
      const owner = table === "category_favorites" ? requiredString(row, "user_id") : row.owner_id;
      if (
        owner !== undefined &&
        owner !== null &&
        (typeof owner !== "string" || !identities.has(owner))
      ) {
        throw new Error(`${table}.${rowId(row)} references an unknown User`);
      }
    }
  }

  for (const row of dataset.tables.categories) {
    const parent = requireReference(row, "parent_id", tables.categories, true);
    if (parent) assertSameOwner(row, parent);
  }
  for (const row of dataset.tables.category_translations) {
    requireReference(row, "category_id", tables.categories);
  }
  for (const row of dataset.tables.category_favorites) {
    const category = requireReference(row, "category_id", tables.categories);
    if (category) assertSameOwner(row, category, "user_id");
  }
  for (const row of dataset.tables.budgets) {
    const category = requireReference(row, "category_id", tables.categories);
    if (category) assertSameOwner(row, category);
  }
  for (const row of dataset.tables.loans) {
    const person = requireReference(row, "person_id", tables.loan_people);
    if (person) assertSameOwner(row, person);
  }
  for (const row of dataset.tables.loan_events) {
    const loan = requireReference(row, "loan_id", tables.loans);
    if (loan) assertSameOwner(row, loan);
  }
  for (const row of dataset.tables.subscriptions) {
    const account = requireReference(row, "account_id", tables.accounts);
    if (account) assertSameOwner(row, account);
    const category = requireReference(row, "category_id", tables.categories, true);
    if (category) assertSameOwner(row, category);
  }
  for (const row of dataset.tables.transactions) {
    for (const column of ["account_id", "to_account_id"] as const) {
      const account = requireReference(row, column, tables.accounts, column === "to_account_id");
      if (account) assertSameOwner(row, account);
    }
    const category = requireReference(row, "category_id", tables.categories, true);
    if (category) assertSameOwner(row, category);
    const subscription = requireReference(row, "subscription_id", tables.subscriptions, true);
    if (subscription) assertSameOwner(row, subscription);
    const linked = requireReference(row, "linked_transfer_id", tables.transactions, true);
    if (linked) assertSameOwner(row, linked);
    const loanEvent = requireReference(row, "loan_event_id", tables.loan_events, true);
    if (loanEvent) assertSameOwner(row, loanEvent);
  }
}

function ownerForRow(table: TableName, row: DataRow, categories: Map<string, DataRow>): string {
  if (table === "category_translations") {
    const category = categories.get(requiredString(row, "category_id"));
    if (!category) throw new Error(`Translation ${rowId(row)} references an unknown category`);
    return nullableString(category, "owner_id") ?? SYSTEM_OWNER;
  }
  if (table === "category_favorites") return requiredString(row, "user_id");
  return nullableString(row, "owner_id") ?? SYSTEM_OWNER;
}

function emptyAggregate(): FinancialAggregate {
  return {
    accountBalances: {},
    transactionAmounts: {},
    budget: { count: 0, amount: "0" },
    subscription: { count: 0, amount: "0" },
    categoryFavorites: 0,
    loanBalances: {},
    loanEventAmounts: {},
  };
}

function addAmount(
  target: Record<string, { count: number; amount: string }>,
  key: string,
  amount: bigint,
): void {
  const current = target[key] ?? { count: 0, amount: "0" };
  target[key] = { count: current.count + 1, amount: (BigInt(current.amount) + amount).toString() };
}

function financialAggregates(dataset: CutoverDataset): Record<string, FinancialAggregate> {
  const result = Object.fromEntries(dataset.identities.map(({ id }) => [id, emptyAggregate()]));
  const aggregate = (owner: string): FinancialAggregate => {
    const value = result[owner];
    if (!value) throw new Error(`Unknown aggregate owner ${owner}`);
    return value;
  };

  for (const row of dataset.tables.accounts) {
    aggregate(requiredString(row, "owner_id")).accountBalances[rowId(row)] = integerValue(
      row,
      "opening_balance",
    ).toString();
  }
  for (const row of dataset.tables.transactions) {
    const owner = requiredString(row, "owner_id");
    const amount = integerValue(row, "amount");
    const type = requiredString(row, "type");
    const ownerAggregate = aggregate(owner);
    addAmount(ownerAggregate.transactionAmounts, type, amount);

    const applyBalance = (accountId: string, delta: bigint): void => {
      ownerAggregate.accountBalances[accountId] = (
        BigInt(ownerAggregate.accountBalances[accountId] ?? "0") + delta
      ).toString();
    };
    const accountId = requiredString(row, "account_id");
    if (type === "expense") applyBalance(accountId, -amount);
    else if (type === "income") applyBalance(accountId, amount);
    else if (type === "transfer") {
      applyBalance(accountId, -amount);
      const toAccount = nullableString(row, "to_account_id");
      if (toAccount) applyBalance(toAccount, amount);
    } else if (type === "loan") {
      applyBalance(
        accountId,
        requiredString(row, "cash_flow_direction") === "inflow" ? amount : -amount,
      );
    }
  }
  for (const row of dataset.tables.budgets) {
    const target = aggregate(requiredString(row, "owner_id")).budget;
    target.count += 1;
    target.amount = (BigInt(target.amount) + integerValue(row, "amount")).toString();
  }
  for (const row of dataset.tables.subscriptions) {
    const target = aggregate(requiredString(row, "owner_id")).subscription;
    target.count += 1;
    target.amount = (BigInt(target.amount) + integerValue(row, "amount")).toString();
  }
  for (const row of dataset.tables.category_favorites) {
    aggregate(requiredString(row, "user_id")).categoryFavorites += 1;
  }
  for (const row of dataset.tables.loans) {
    aggregate(requiredString(row, "owner_id")).loanBalances[rowId(row)] = "0";
  }
  for (const row of dataset.tables.loan_events) {
    const ownerAggregate = aggregate(requiredString(row, "owner_id"));
    const kind = requiredString(row, "kind");
    const amount = integerValue(row, "amount");
    addAmount(ownerAggregate.loanEventAmounts, kind, amount);
    const loanId = requiredString(row, "loan_id");
    const delta = kind === "disbursement" || kind === "opening" ? amount : -amount;
    ownerAggregate.loanBalances[loanId] = (
      BigInt(ownerAggregate.loanBalances[loanId] ?? "0") + delta
    ).toString();
  }
  return result;
}

export function createManifest(dataset: CutoverDataset): Manifest {
  validateDatasetInvariants(dataset);
  const categories = rowsById(dataset.tables.categories);
  const tables = Object.fromEntries(
    (Object.keys(TABLE_DEFINITIONS) as TableName[]).map((table) => {
      const rows = dataset.tables[table];
      const grouped = new Map<string, DataRow[]>();
      for (const row of rows) {
        const owner = ownerForRow(table, row, categories);
        grouped.set(owner, [...(grouped.get(owner) ?? []), row]);
      }
      return [
        table,
        {
          count: rows.length,
          digest: digestRows(rows),
          perUser: Object.fromEntries(
            [...grouped.entries()]
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([owner, ownedRows]) => [
                owner,
                { count: ownedRows.length, digest: digestRows(ownedRows) },
              ]),
          ),
        },
      ];
    }),
  ) as Manifest["tables"];

  return {
    version: 1,
    identities: { count: dataset.identities.length, digest: digestRows(dataset.identities) },
    tables,
    transactionsById: Object.fromEntries(
      dataset.tables.transactions.map((row) => [rowId(row), digestRows([row])]),
    ),
    financialByUser: financialAggregates(dataset),
  };
}

export function compareManifests(source: Manifest, target: Manifest): string[] {
  if (canonicalJson(source) === canonicalJson(target)) return [];
  const differences: string[] = [];
  if (canonicalJson(source.identities) !== canonicalJson(target.identities)) {
    differences.push("identity count or digest differs");
  }
  for (const table of Object.keys(TABLE_DEFINITIONS) as TableName[]) {
    if (canonicalJson(source.tables[table]) !== canonicalJson(target.tables[table])) {
      differences.push(`${table} count, digest, or per-User ownership differs`);
    }
  }
  const transactionIds = new Set([
    ...Object.keys(source.transactionsById),
    ...Object.keys(target.transactionsById),
  ]);
  for (const id of [...transactionIds].sort()) {
    if (source.transactionsById[id] !== target.transactionsById[id]) {
      differences.push(`transaction ${id} is missing or differs`);
    }
  }
  if (canonicalJson(source.financialByUser) !== canonicalJson(target.financialByUser)) {
    differences.push("per-User financial aggregates differ");
  }
  return differences;
}

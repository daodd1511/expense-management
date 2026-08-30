import { describe, expect, it } from "vitest";
import {
  TABLE_DEFINITIONS,
  compareManifests,
  createManifest,
  type CutoverDataset,
  type DataRow,
  type TableName,
} from "./manifest";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const CATEGORY_A = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const TRANSACTION_A = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";

function emptyTables(): CutoverDataset["tables"] {
  return Object.fromEntries(
    (Object.keys(TABLE_DEFINITIONS) as TableName[]).map((table) => [table, []]),
  ) as unknown as CutoverDataset["tables"];
}

function dataset(): CutoverDataset {
  const tables = emptyTables();
  tables.accounts.push({
    id: ACCOUNT_A,
    owner_id: USER_A,
    name: "Cash",
    kind: "cash",
    opening_balance: "1000",
    archived: false,
    created_at: "2026-08-01T00:00:00.000Z",
    display_order: 0,
  });
  tables.categories.push({
    id: CATEGORY_A,
    owner_id: USER_A,
    name: "Food",
    icon: "food",
    color: "red",
    created_at: "2026-08-01T00:00:00.000Z",
    type: "expense",
    parent_id: null,
    is_hidden: false,
  });
  tables.transactions.push({
    id: TRANSACTION_A,
    owner_id: USER_A,
    type: "expense",
    amount: "250",
    category_id: CATEGORY_A,
    account_id: ACCOUNT_A,
    to_account_id: null,
    merchant: "Market",
    note: null,
    tx_date: "2026-08-02",
    receipt_url: null,
    subscription_id: null,
    created_at: "2026-08-02T01:00:00.000Z",
    tx_time: "08:00:00",
    linked_transfer_id: null,
    cash_flow_direction: null,
    loan_event_id: null,
  });
  return {
    version: 1,
    exportedAt: "2026-08-30T00:00:00.000Z",
    identities: [USER_B, USER_A].map((id, index) => ({
      id,
      name: `person${index}@example.com`,
      email: `person${index}@example.com`,
      emailVerified: false,
      image: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    })),
    tables,
  };
}

describe("cutover manifest", () => {
  it("is deterministic and records exact Transaction and financial state", () => {
    const source = dataset();
    const reordered = structuredClone(source);
    reordered.identities.reverse();

    const sourceManifest = createManifest(source);
    const reorderedManifest = createManifest(reordered);

    expect(compareManifests(sourceManifest, reorderedManifest)).toEqual([]);
    expect(sourceManifest.transactionsById[TRANSACTION_A]).toMatch(/^[0-9a-f]{64}$/);
    expect(sourceManifest.financialByUser[USER_A]?.accountBalances[ACCOUNT_A]).toBe("750");
  });

  it("fails closed on a column-level Transaction difference", () => {
    const source = createManifest(dataset());
    const changed = dataset();
    changed.tables.transactions[0] = {
      ...changed.tables.transactions[0],
      note: "rewritten",
    } as DataRow;

    expect(compareManifests(source, createManifest(changed))).toContain(
      `transaction ${TRANSACTION_A} is missing or differs`,
    );
  });

  it("rejects cross-User and orphaned relationships before hashing", () => {
    const changed = dataset();
    changed.tables.accounts[0] = { ...changed.tables.accounts[0], owner_id: USER_B } as DataRow;

    expect(() => createManifest(changed)).toThrow("references a row owned by another User");
  });

  it("rejects unexpected identity fields", () => {
    const changed = dataset();
    changed.identities[0] = { ...changed.identities[0], password_hash: "forbidden" } as never;

    expect(() => createManifest(changed)).toThrow("missing or unsafe fields");
  });
});

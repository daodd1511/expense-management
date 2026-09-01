import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client, type ClientBase } from "../../packages/api/src/db/pg";
import {
  TABLE_DEFINITIONS,
  compareManifests,
  createManifest,
  readDataset,
  type CutoverArtifact,
  type CutoverDataset,
  type DataRow,
  type TableName,
} from "./manifest";

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function inputArgument(argv: string[]): string {
  const index = argv.indexOf("--input");
  const input = index >= 0 ? argv[index + 1] : undefined;
  if (!input || input.startsWith("-")) {
    throw new Error("Usage: pnpm cutover:import -- --input <frozen-json-file>");
  }
  return path.resolve(input);
}

export async function readArtifact(input: string): Promise<CutoverArtifact> {
  const parsed: unknown = JSON.parse(await readFile(input, "utf8"));
  if (!parsed || typeof parsed !== "object" || !("dataset" in parsed) || !("manifest" in parsed)) {
    throw new Error("Invalid cutover artifact");
  }
  const artifact = parsed as CutoverArtifact;
  const rebuilt = createManifest(artifact.dataset);
  if (JSON.stringify(rebuilt) !== JSON.stringify(artifact.manifest)) {
    throw new Error("Cutover artifact manifest does not match its dataset");
  }
  return artifact;
}

async function assertTargetIsImportable(client: ClientBase): Promise<void> {
  const users = await client.query<{ count: string }>(
    'select count(*)::text as count from auth."user"',
  );
  if (users.rows[0]?.count !== "0") throw new Error("Target auth schema already contains Users");

  for (const table of Object.keys(TABLE_DEFINITIONS) as TableName[]) {
    const condition =
      table === "categories"
        ? " where owner_id is not null"
        : table === "category_translations"
          ? " where category_id in (select id from public.categories where owner_id is not null)"
          : "";
    const result = await client.query<{ count: string }>(
      `select count(*)::text as count from public.${quoteIdentifier(table)}${condition}`,
    );
    if (result.rows[0]?.count !== "0") {
      throw new Error(`Target ${table} already contains User data`);
    }
  }
}

async function upsertRows(
  client: ClientBase,
  schema: "auth" | "public",
  table: string,
  columns: readonly string[],
  rows: DataRow[],
  overrides: Record<string, unknown> = {},
): Promise<void> {
  if (rows.length === 0) return;
  const names = columns.map(quoteIdentifier).join(", ");
  const assignments = columns
    .filter((column) => column !== "id")
    .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
    .join(", ");
  for (const row of rows) {
    const values = columns.map((column) => (column in overrides ? overrides[column] : row[column]));
    const parameters = columns.map((_, index) => `$${index + 1}`).join(", ");
    await client.query(
      `insert into ${quoteIdentifier(schema)}.${quoteIdentifier(table)} (${names}) values (${parameters}) on conflict (${quoteIdentifier("id")}) do update set ${assignments}`,
      values,
    );
  }
}

export async function importDataset(client: ClientBase, dataset: CutoverDataset): Promise<void> {
  const sourceManifest = createManifest(dataset);
  await client.query("begin");
  try {
    await assertTargetIsImportable(client);
    await upsertRows(
      client,
      "auth",
      "user",
      ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
      dataset.identities,
    );

    await upsertRows(
      client,
      "public",
      "categories",
      TABLE_DEFINITIONS.categories,
      dataset.tables.categories,
      { parent_id: null },
    );
    for (const table of [
      "category_translations",
      "accounts",
      "budgets",
      "loan_people",
      "loans",
      "loan_events",
      "subscriptions",
    ] as const) {
      await upsertRows(client, "public", table, TABLE_DEFINITIONS[table], dataset.tables[table]);
    }
    await upsertRows(
      client,
      "public",
      "transactions",
      TABLE_DEFINITIONS.transactions,
      dataset.tables.transactions,
      { linked_transfer_id: null },
    );
    await upsertRows(
      client,
      "public",
      "category_favorites",
      TABLE_DEFINITIONS.category_favorites,
      dataset.tables.category_favorites,
    );

    for (const row of dataset.tables.categories) {
      await client.query("update public.categories set parent_id = $1 where id = $2", [
        row.parent_id,
        row.id,
      ]);
    }
    for (const row of dataset.tables.transactions) {
      await client.query("update public.transactions set linked_transfer_id = $1 where id = $2", [
        row.linked_transfer_id,
        row.id,
      ]);
    }
    const differences = compareManifests(sourceManifest, createManifest(await readDataset(client)));
    if (differences.length > 0) {
      throw new Error(`Imported target differs from source:\n- ${differences.join("\n- ")}`);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.TARGET_DATABASE_URL;
  if (!databaseUrl) throw new Error("TARGET_DATABASE_URL is required");
  const artifact = await readArtifact(inputArgument(process.argv.slice(2)));
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await importDataset(client, artifact.dataset);
  } finally {
    await client.end();
  }
  process.stdout.write(`Imported ${artifact.dataset.identities.length} preserved identities\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Cutover import failed"}\n`);
    process.exitCode = 1;
  });
}

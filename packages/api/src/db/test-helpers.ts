import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

/**
 * Base admin connection string for the integration test suite, e.g.
 * `postgres://wallet_migrator:<password>@localhost:<port>/postgres` — a role with
 * `CREATEDB` pointed at Postgres's own maintenance database, never at a database this
 * suite intends to use directly. Unset in normal `pnpm test` runs (typecheck/unit
 * suites elsewhere in the repo don't need Postgres); every test in this directory
 * skips itself when it's absent rather than failing, and Phase 5 is what wires a real
 * value into CI.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export const hasTestDatabase = Boolean(TEST_DATABASE_URL);

const TEST_APP_PASSWORD = "wallet_app_test_password";
const TEST_AUTH_PASSWORD = "wallet_auth_test_password";

function repoRoot(): string {
  // this file: packages/api/src/db/test-helpers.ts -> repo root is 4 levels up
  return path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
}

function dbmateBin(): string {
  return path.join(repoRoot(), "node_modules/.bin/dbmate");
}

function migrationsDir(): string {
  return path.join(repoRoot(), "db/migrations");
}

/** Runs `dbmate <command>` against `databaseUrl`, never touching the schema-file dump
 * (`--no-dump-schema`) since these are throwaway test databases. `down` rolls back
 * exactly one migration per call, matching the real `dbmate` CLI. */
export async function runDbmate(databaseUrl: string, command: "up" | "status" | "drop" | "down") {
  return execFileAsync(
    dbmateBin(),
    ["--no-dump-schema", "--migrations-dir", migrationsDir(), "-u", databaseUrl, command],
    { env: process.env },
  );
}

function urlWithDatabase(base: string, dbName: string): string {
  const url = new URL(base);
  url.pathname = `/${dbName}`;
  return url.toString();
}

function urlWithRole(base: string, username: string, password: string): string {
  const url = new URL(base);
  url.username = username;
  url.password = password;
  return url.toString();
}

/**
 * Creates a uniquely-named scratch database, runs every Dbmate migration against it,
 * sets throwaway passwords for `wallet_app`/`wallet_auth` (cluster-wide roles the
 * migrations already created without a password — see
 * `db/migrations/20260828000001_create_roles.sql`), hands connection strings for all
 * three roles to `work`, then drops the database unconditionally.
 *
 * Every integration test in this directory goes through this instead of sharing one
 * long-lived test database, so a bug one test introduces can never leak into another.
 */
export async function withMigratedDatabase<T>(
  work: (ctx: { migratorUrl: string; appUrl: string; authUrl: string }) => Promise<T>,
): Promise<T> {
  if (!TEST_DATABASE_URL) {
    throw new Error("withMigratedDatabase: TEST_DATABASE_URL is not set");
  }

  const dbName = `wallet_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const migratorUrl = urlWithDatabase(TEST_DATABASE_URL, dbName);

  // `wallet_app`/`wallet_auth` are cluster-wide roles, and migration 0004 GRANTs many
  // objects to them — which writes to `pg_shdepend`, a *shared* (cluster-wide, not
  // per-database) catalog. Vitest runs test files in parallel, so two ephemeral
  // databases running `dbmate up` at the same time can hit Postgres's "tuple
  // concurrently updated" there, not just on the `ALTER ROLE` below. A cluster-wide
  // advisory lock held for this whole bootstrap-to-teardown cycle — acquired on its
  // own connection, since advisory locks are keyed cluster-wide regardless of which
  // database a session is connected to — makes every ephemeral database's lifecycle
  // fully serialized instead of racing another one's migration or teardown.
  const lock = new Client({ connectionString: TEST_DATABASE_URL });
  await lock.connect();
  await lock.query("select pg_advisory_lock(727385)");

  try {
    await runDbmate(migratorUrl, "up");

    const setup = new Client({ connectionString: migratorUrl });
    await setup.connect();
    try {
      await setup.query(`ALTER ROLE wallet_app WITH PASSWORD '${TEST_APP_PASSWORD}'`);
      await setup.query(`ALTER ROLE wallet_auth WITH PASSWORD '${TEST_AUTH_PASSWORD}'`);
    } finally {
      await setup.end();
    }

    return await work({
      migratorUrl,
      appUrl: urlWithRole(migratorUrl, "wallet_app", TEST_APP_PASSWORD),
      authUrl: urlWithRole(migratorUrl, "wallet_auth", TEST_AUTH_PASSWORD),
    });
  } finally {
    // Every test in this directory is expected to close its own connection to this
    // database inside `work`, before `withMigratedDatabase` returns — `DROP DATABASE`
    // refuses to run while any connection to it is still open. This is a safety net
    // for a bug in that contract, not a pattern to lean on: log when it actually finds
    // something to kill, so a future test that leaks a connection is visible instead
    // of silently "working anyway" (which is exactly how the last version of this
    // safety net hid a real, always-firing bug — see the git history of this file).
    const terminated = await lock
      .query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()", [
        dbName,
      ])
      .catch((error: unknown) => {
        console.error(`withMigratedDatabase: failed to check/terminate lingering connections to ${dbName}`, error);
        return undefined;
      });
    if (terminated && terminated.rowCount) {
      console.error(
        `withMigratedDatabase: ${dbName} still had ${terminated.rowCount} open connection(s) when work() returned — a test in this run leaked one instead of closing it itself`,
      );
    }
    try {
      await runDbmate(migratorUrl, "drop");
    } catch (error) {
      // Not swallowed silently: a `wallet_test_*` database that fails to drop leaks
      // `wallet_app`/`wallet_auth` grants cluster-wide, which then breaks unrelated
      // tests' own role cleanup in a confusing way (see the git history of this file).
      console.error(`withMigratedDatabase: failed to drop ${dbName}`, error);
    }
    await lock.query("select pg_advisory_unlock(727385)").catch(() => {});
    await lock.end();
  }
}

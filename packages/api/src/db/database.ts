import { Kysely, PostgresDialect, sql, type Transaction } from "kysely";
import { Pool } from "pg";
import type { DB } from "./types";

export type Database = DB;

/** Executor type every repository accepts: either the top-level `Kysely` instance or
 * a transaction handle. Repositories must never construct their own pool or client —
 * this keeps every query bound to the transaction `withAppTransaction` opened, so the
 * RLS identity set on it always applies. */
export type AppDb = Kysely<Database> | Transaction<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export interface AppDatabase {
  pool: Pool;
  db: Kysely<Database>;
  /** See the module-level `withAppTransaction` doc comment; identical behavior, bound
   * to this instance's own pool instead of the lazy default one. */
  withAppTransaction<T>(userId: string, work: (trx: AppDb) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Builds an independent `wallet_app` database handle bound to `connectionString`,
 * with `search_path` pinned to `public` explicitly rather than relying on the role's
 * default (per `docs/specs/supabase-exit/PLAN.md`).
 *
 * The default `withAppTransaction`/`getAppDatabase` exports below are a lazily-built
 * singleton over this factory, reading `APP_DATABASE_URL` on first use — that's what
 * runtime code should import. This factory exists so tests can point a real,
 * unmodified `withAppTransaction` at an ephemeral per-test database instead of only
 * exercising a hand-rolled reimplementation of its `set_config` logic.
 */
export function createAppDatabase(connectionString: string): AppDatabase {
  const pool = new Pool({ connectionString, options: "-c search_path=public" });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  async function withAppTransaction<T>(userId: string, work: (trx: AppDb) => Promise<T>): Promise<T> {
    if (!UUID_PATTERN.test(userId)) {
      throw new Error(`withAppTransaction: userId is not a UUID: ${userId}`);
    }

    return db.transaction().execute(async (trx) => {
      await sql`select set_config('wallet.user_id', ${userId}, true)`.execute(trx);
      return work(trx);
    });
  }

  async function close(): Promise<void> {
    await db.destroy();
  }

  return { pool, db, withAppTransaction, close };
}

let defaultApp: AppDatabase | undefined;

function getAppDatabase(): AppDatabase {
  defaultApp ??= createAppDatabase(requireEnv("APP_DATABASE_URL"));
  return defaultApp;
}

/**
 * Runs `work` inside one `wallet_app` database transaction with the authenticated
 * User's identity set for PostgreSQL RLS to enforce (ADR-0010).
 *
 * `userId` is written with `set_config('wallet.user_id', userId, true)` — the `true`
 * ("is_local") argument scopes the setting to this transaction only, so a pooled
 * connection can never carry one request's identity into the next. The setting is
 * therefore already clear before the connection returns to the pool; no explicit
 * `RESET` is needed on commit or rollback.
 *
 * Every repository call made through `trx` runs under this identity: RLS silently
 * denies any row a missing or wrong owner predicate would otherwise have leaked, and
 * the transaction commits on a successful return or rolls back if `work` throws.
 *
 * @param userId - The authenticated User's UUID. Rejected up front (before opening a
 *   transaction) if it is not a well-formed UUID, matching how a malformed value fails
 *   closed at the database layer too.
 * @param work - Repository/service logic to run with `trx` as the executor.
 */
export function withAppTransaction<T>(userId: string, work: (trx: AppDb) => Promise<T>): Promise<T> {
  return getAppDatabase().withAppTransaction(userId, work);
}

let defaultAuthPool: Pool | undefined;

/** The `wallet_auth` pool: Better Auth's own connection, scoped to the `auth` schema.
 * Lazy for the same reason `withAppTransaction`'s pool is: importing this module must
 * never eagerly require `AUTH_DATABASE_URL` to be set. Wired into Better Auth's
 * runtime in Phase 3. */
export function getAuthPool(): Pool {
  defaultAuthPool ??= new Pool({
    connectionString: requireEnv("AUTH_DATABASE_URL"),
    options: "-c search_path=auth",
  });
  return defaultAuthPool;
}

/** Closes the default app database and auth pool, if either was ever constructed, and
 * clears both singletons so a later `withAppTransaction`/`getAuthPool` call rebuilds a
 * fresh one instead of returning the now-dead instance. Call once on process shutdown;
 * never mid-request. */
export async function closeDatabase(): Promise<void> {
  await defaultApp?.close();
  defaultApp = undefined;
  await defaultAuthPool?.end();
  defaultAuthPool = undefined;
}

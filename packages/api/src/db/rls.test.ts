import { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase, withMigratedDatabase } from "./test-helpers";

// Every test here queues behind test-helpers.ts's cluster-wide advisory lock (see its
// comment on `withMigratedDatabase`), so total wall time scales with how many DB
// integration tests run across every file in this directory, not just this file's own
// work. The default 5s per-test timeout is tuned for unit tests, not that queue.
vi.setConfig({ testTimeout: 20_000 });

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

async function asRole(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function seedUsers(migratorUrl: string) {
  const migrator = await asRole(migratorUrl);
  try {
    await migrator.query(
      `insert into auth."user" (id, name, email, "emailVerified") values
         ($1, 'A', 'a@example.com', true),
         ($2, 'B', 'b@example.com', true)`,
      [USER_A, USER_B],
    );
  } finally {
    await migrator.end();
  }
}

/** Every test closes its `wallet_app` client itself, inside `work`, before
 * `withMigratedDatabase` returns — `DROP DATABASE` fails while any connection to it is
 * still open, and `withMigratedDatabase` runs on a strict schedule relative to when
 * this function's caller gets control back, not relative to a later `afterEach`. */
async function withAppClient<T>(appUrl: string, run: (app: Client) => Promise<T>): Promise<T> {
  const app = await asRole(appUrl);
  try {
    return await run(app);
  } finally {
    await app.end();
  }
}

// Requires TEST_DATABASE_URL; skipped otherwise (see test-helpers.ts).
describe.skipIf(!hasTestDatabase)("RLS as wallet_app", () => {
  it("hides another User's row even when a query omits the owner predicate", async () => {
    await withMigratedDatabase(async ({ migratorUrl, appUrl }) => {
      await seedUsers(migratorUrl);
      await withAppClient(appUrl, async (app) => {
        await app.query("begin");
        await app.query("select set_config('wallet.user_id', $1, true)", [USER_A]);
        await app.query(
          `insert into public.accounts (owner_id, name, kind, display_order) values ($1, 'A checking', 'bank', 0)`,
          [USER_A],
        );
        await app.query("commit");

        await app.query("begin");
        await app.query("select set_config('wallet.user_id', $1, true)", [USER_B]);
        // Deliberately no `where owner_id = ...` — RLS alone must still hide A's row.
        const { rows } = await app.query("select * from public.accounts");
        await app.query("commit");

        expect(rows).toHaveLength(0);
      });
    });
  });

  it("denies all access when no transaction identity is set", async () => {
    await withMigratedDatabase(async ({ migratorUrl, appUrl }) => {
      await seedUsers(migratorUrl);
      await withAppClient(appUrl, async (app) => {
        await app.query("begin");
        const { rows } = await app.query("select * from public.categories where owner_id is not null");
        await app.query("commit");

        expect(rows).toHaveLength(0);
      });
    });
  });

  it("fails closed on a malformed transaction identity instead of matching no rows silently", async () => {
    await withMigratedDatabase(async ({ appUrl }) => {
      await withAppClient(appUrl, async (app) => {
        await app.query("begin");
        await app.query("select set_config('wallet.user_id', 'not-a-uuid', true)");
        await expect(app.query("select * from public.accounts")).rejects.toThrow(
          /invalid input syntax for type uuid/,
        );
        await app.query("rollback");
      });
    });
  });

  it("blocks wallet_app from writing a System category even as its own owner", async () => {
    await withMigratedDatabase(async ({ migratorUrl, appUrl }) => {
      await seedUsers(migratorUrl);
      await withAppClient(appUrl, async (app) => {
        await app.query("begin");
        await app.query("select set_config('wallet.user_id', $1, true)", [USER_A]);
        await expect(
          app.query(
            `insert into public.categories (owner_id, name, icon, color, type) values (null, 'Hack', 'X', 'chart-1', 'expense')`,
          ),
        ).rejects.toThrow(/row-level security policy/);
        await app.query("rollback");
      });
    });
  });

  it("still lets every authenticated User read shared System categories", async () => {
    await withMigratedDatabase(async ({ migratorUrl, appUrl }) => {
      await seedUsers(migratorUrl);
      await withAppClient(appUrl, async (app) => {
        await app.query("begin");
        await app.query("select set_config('wallet.user_id', $1, true)", [USER_A]);
        const { rows } = await app.query("select id from public.categories where owner_id is null");
        await app.query("commit");

        expect(rows.length).toBe(68);
      });
    });
  });

  it("has no privileges on the auth schema at all", async () => {
    await withMigratedDatabase(async ({ appUrl }) => {
      await withAppClient(appUrl, async (app) => {
        await expect(app.query('select * from auth."user"')).rejects.toThrow(/permission denied for schema auth/);
      });
    });
  });
});

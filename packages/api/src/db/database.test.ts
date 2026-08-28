import { sql } from "kysely";
import { describe, expect, it, vi } from "vitest";
import { createAppDatabase } from "./database";
import { hasTestDatabase, withMigratedDatabase } from "./test-helpers";

// See rls.test.ts for why the DB-backed tests below need a longer-than-default timeout.
vi.setConfig({ testTimeout: 20_000 });

describe("withAppTransaction", () => {
  it("rejects a malformed userId before running any query", async () => {
    // A `pg.Pool` never connects until a query runs, so this never touches a real
    // database — it only proves the exported `withAppTransaction` validates its input.
    const app = createAppDatabase("postgres://unused@localhost:1/unused");
    try {
      await expect(app.withAppTransaction("not-a-uuid", async () => "unreachable")).rejects.toThrow(
        /not a UUID/,
      );
    } finally {
      await app.close();
    }
  });

  describe.skipIf(!hasTestDatabase)("against a migrated database", () => {
    it("scopes the identity to one transaction and clears it once the connection is reused", async () => {
      await withMigratedDatabase(async ({ appUrl }) => {
        const app = createAppDatabase(appUrl);
        // Closed here, inside `work`, not in an `afterEach` — `withMigratedDatabase`
        // drops this database as soon as `work` returns, and `DROP DATABASE` fails
        // while any connection to it is still open.
        try {
          const userId = "11111111-1111-1111-1111-111111111111";

          const seenDuring = await app.withAppTransaction(userId, async (trx) => {
            const [row] = (await sql`select current_setting('wallet.user_id', true) as id`.execute(trx))
              .rows as { id: string }[];
            return row.id;
          });
          expect(seenDuring).toBe(userId);

          // A fresh transaction may reuse the same pooled physical connection, but the
          // `is_local` (transaction-scoped) `set_config` `withAppTransaction` uses
          // never survives past the commit — proving one request's identity can't leak
          // into the next through the exported function itself, not a reimplementation
          // of it.
          const seenAfter = await app.db.transaction().execute(async (trx) => {
            const [row] = (await sql`select current_setting('wallet.user_id', true) as id`.execute(trx))
              .rows as { id: string | null }[];
            return row.id;
          });
          expect(seenAfter).toBeFalsy();
        } finally {
          await app.close();
        }
      });
    });

    it("rolls back every write when work throws", async () => {
      await withMigratedDatabase(async ({ migratorUrl, appUrl }) => {
        const migrator = createAppDatabase(migratorUrl);
        const app = createAppDatabase(appUrl);
        try {
          const userId = "11111111-1111-1111-1111-111111111111";
          await sql`insert into auth."user" (id, name, email, "emailVerified") values (${userId}, 'A', 'a@example.com', true)`.execute(
            migrator.db,
          );

          await expect(
            app.withAppTransaction(userId, async (trx) => {
              await trx
                .insertInto("accounts")
                .values({ owner_id: userId, name: "Doomed", kind: "bank", display_order: 0 })
                .execute();
              throw new Error("boom");
            }),
          ).rejects.toThrow("boom");

          const remaining = await app.withAppTransaction(userId, (trx) =>
            trx.selectFrom("accounts").selectAll().execute(),
          );
          expect(remaining).toHaveLength(0);
        } finally {
          await app.close();
          await migrator.close();
        }
      });
    });
  });
});

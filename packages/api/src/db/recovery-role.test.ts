import { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase, withMigratedDatabase } from "./test-helpers";

vi.setConfig({ testTimeout: 20_000 });

describe.skipIf(!hasTestDatabase)("wallet_recovery role", () => {
  it("reads application and auth data but cannot mutate either schema", async () => {
    await withMigratedDatabase(async ({ migratorUrl, recoveryUrl }) => {
      const migrator = new Client({ connectionString: migratorUrl });
      const recovery = new Client({ connectionString: recoveryUrl });
      await migrator.connect();
      await recovery.connect();
      try {
        const role = await migrator.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
          "select rolbypassrls, rolsuper from pg_roles where rolname = 'wallet_recovery'",
        );
        expect(role.rows).toEqual([{ rolbypassrls: true, rolsuper: false }]);
        await expect(recovery.query("select count(*) from public.accounts")).resolves.toBeTruthy();
        await expect(recovery.query('select count(*) from auth."user"')).resolves.toBeTruthy();
        await expect(
          recovery.query(
            "insert into public.accounts (owner_id, name, kind, display_order) values (gen_random_uuid(), 'forbidden', 'cash', 0)",
          ),
        ).rejects.toThrow(/permission denied/);
      } finally {
        await recovery.end();
        await migrator.end();
      }
    });
  });
});

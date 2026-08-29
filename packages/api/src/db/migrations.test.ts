import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase, runDbmate, withMigratedDatabase } from "./test-helpers";

// See rls.test.ts for why these need a longer-than-default timeout.
vi.setConfig({ testTimeout: 20_000 });

// Requires TEST_DATABASE_URL (see test-helpers.ts). Skipped in the plain `pnpm test`
// run everywhere else in the repo.
describe.skipIf(!hasTestDatabase)("Dbmate migration chain", () => {
  it("bootstraps the complete schema from an empty PostgreSQL 17 database", async () => {
    await withMigratedDatabase(async ({ migratorUrl }) => {
      const status = await runDbmate(migratorUrl, "status");
      expect(status.stdout).toContain("Applied: 6");
      expect(status.stdout).toContain("Pending: 0");
    });
  });

  it("is a no-op the second time it runs against an already-migrated database", async () => {
    await withMigratedDatabase(async ({ migratorUrl }) => {
      const secondRun = await runDbmate(migratorUrl, "up");
      // dbmate prints one "Applying:"/"Applied:" pair per migration it actually runs;
      // a no-op second run prints nothing on stdout.
      expect(secondRun.stdout.trim()).toBe("");

      const status = await runDbmate(migratorUrl, "status");
      expect(status.stdout).toContain("Applied: 6");
      expect(status.stdout).toContain("Pending: 0");
    });
  });

  it("rolls every migration back cleanly and can re-bootstrap from there", async () => {
    await withMigratedDatabase(async ({ migratorUrl }) => {
      // `dbmate down` reverts exactly one migration per call; each migration's own
      // `migrate:down` section must tolerate running in strict reverse-dependency
      // order (a `DROP TABLE` before another table's still-live foreign key into it
      // fails loudly, which is exactly the kind of bug this test exists to catch).
      for (let i = 0; i < 6; i++) {
        await runDbmate(migratorUrl, "down");
      }

      const afterDown = await runDbmate(migratorUrl, "status");
      expect(afterDown.stdout).toContain("Applied: 0");
      expect(afterDown.stdout).toContain("Pending: 6");

      // Re-bootstrapping from the rolled-back state must also succeed: a `migrate:down`
      // that leaves behind an object its own `migrate:up` recreates without
      // `CREATE OR REPLACE` (e.g. a function) would fail here, not on the first `up`.
      await runDbmate(migratorUrl, "up");
      const afterUp = await runDbmate(migratorUrl, "status");
      expect(afterUp.stdout).toContain("Applied: 6");
      expect(afterUp.stdout).toContain("Pending: 0");
    });
  });
});

import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "../../packages/api/src/db/pg";
import { describe, expect, it } from "vitest";
import { hasTestDatabase, withMigratedDatabase } from "../../packages/api/src/db/test-helpers";

const execFileAsync = promisify(execFile);

function roleUrl(base: string, username: string, password: string): string {
  const url = new URL(base);
  url.username = username;
  url.password = password;
  return url.toString();
}

describe.skipIf(!hasTestDatabase)("runtime role bootstrap", () => {
  it("creates restricted roles and credentials without exposing secrets", async () => {
    await withMigratedDatabase(async ({ adminUrl }) => {
      const adminConnection = new URL(adminUrl);
      const postgresContainer = process.env.TEST_POSTGRES_CONTAINER_ID ?? "wallet-phase2-pg";
      if (!/^[a-zA-Z0-9_.-]+$/.test(postgresContainer)) {
        throw new Error("TEST_POSTGRES_CONTAINER_ID contains unsupported characters");
      }
      const temporary = await mkdtemp(path.join(os.tmpdir(), "wallet-role-bootstrap-"));
      const bin = path.join(temporary, "bin");
      await mkdir(bin);
      await writeFile(
        path.join(bin, "psql"),
        `#!/bin/sh\nset -eu\nexec docker exec -e WALLET_MIGRATOR_PASSWORD -e WALLET_APP_PASSWORD -e WALLET_AUTH_PASSWORD -e WALLET_RECOVERY_PASSWORD -i ${postgresContainer} psql -U "$PGUSER" -d "$PGDATABASE" "$@"\n`,
        { mode: 0o700 },
      );
      const passwords = {
        migrator: "bootstrap_migrator_password",
        app: "bootstrap_app_password",
        auth: "bootstrap_auth_password",
        recovery: "bootstrap_recovery_password",
      };
      const result = await execFileAsync("tools/ops/bootstrap-roles.sh", [], {
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
          PGHOST: adminConnection.hostname,
          PGPORT: adminConnection.port,
          PGDATABASE: adminConnection.pathname.slice(1),
          PGUSER: decodeURIComponent(adminConnection.username),
          PGPASSWORD: decodeURIComponent(adminConnection.password),
          WALLET_MIGRATOR_PASSWORD: passwords.migrator,
          WALLET_APP_PASSWORD: passwords.app,
          WALLET_AUTH_PASSWORD: passwords.auth,
          WALLET_RECOVERY_PASSWORD: passwords.recovery,
        },
      });

      expect(result.stderr).toBe("");
      for (const [role, password] of Object.entries(passwords)) {
        expect(result.stdout).not.toContain(password);
        expect(result.stderr).not.toContain(password);
        const client = new Client({
          connectionString: roleUrl(adminUrl, `wallet_${role}`, password),
        });
        await client.connect();
        await client.end();
      }

      const admin = new Client({ connectionString: adminUrl });
      await admin.connect();
      try {
        const roles = await admin.query<{
          rolname: string;
          rolsuper: boolean;
          rolcreatedb: boolean;
          rolcreaterole: boolean;
          rolbypassrls: boolean;
        }>(`
          select rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
          from pg_roles
          where rolname in ('wallet_migrator', 'wallet_app', 'wallet_auth', 'wallet_recovery')
          order by rolname
        `);
        expect(roles.rows).toEqual([
          {
            rolname: "wallet_app",
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolbypassrls: false,
          },
          {
            rolname: "wallet_auth",
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolbypassrls: false,
          },
          {
            rolname: "wallet_migrator",
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolbypassrls: false,
          },
          {
            rolname: "wallet_recovery",
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolbypassrls: true,
          },
        ]);
        const owner = await admin.query<{ owner: string }>(
          "select pg_get_userbyid(datdba) as owner from pg_database where datname = current_database()",
        );
        expect(owner.rows).toEqual([{ owner: "wallet_migrator" }]);
      } finally {
        await admin.end();
      }
    });
  });
});

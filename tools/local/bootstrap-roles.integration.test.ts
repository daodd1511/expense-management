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
  it("sets distinct credentials without placing them in arguments or output", async () => {
    await withMigratedDatabase(async ({ migratorUrl }) => {
      const migrator = new URL(migratorUrl);
      const postgresContainer = process.env.TEST_POSTGRES_CONTAINER_ID ?? "wallet-phase2-pg";
      if (!/^[a-zA-Z0-9_.-]+$/.test(postgresContainer)) {
        throw new Error("TEST_POSTGRES_CONTAINER_ID contains unsupported characters");
      }
      const temporary = await mkdtemp(path.join(os.tmpdir(), "wallet-role-bootstrap-"));
      const bin = path.join(temporary, "bin");
      await mkdir(bin);
      await writeFile(
        path.join(bin, "psql"),
        `#!/bin/sh\nset -eu\nexec docker exec -e WALLET_APP_PASSWORD -e WALLET_AUTH_PASSWORD -e WALLET_RECOVERY_PASSWORD -i ${postgresContainer} psql -U "$PGUSER" -d "$PGDATABASE" "$@"\n`,
        { mode: 0o700 },
      );
      const passwords = {
        app: "bootstrap_app_password",
        auth: "bootstrap_auth_password",
        recovery: "bootstrap_recovery_password",
      };
      const result = await execFileAsync("tools/local/bootstrap-roles.sh", [], {
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
          PGHOST: migrator.hostname,
          PGPORT: migrator.port,
          PGDATABASE: migrator.pathname.slice(1),
          PGUSER: decodeURIComponent(migrator.username),
          PGPASSWORD: decodeURIComponent(migrator.password),
          WALLET_APP_PASSWORD: passwords.app,
          WALLET_AUTH_PASSWORD: passwords.auth,
          WALLET_RECOVERY_PASSWORD: passwords.recovery,
        },
      });

      expect(result.stdout).toBe("ALTER ROLE\nALTER ROLE\nALTER ROLE\n");
      expect(result.stderr).toBe("");
      for (const [role, password] of Object.entries(passwords)) {
        expect(result.stdout).not.toContain(password);
        expect(result.stderr).not.toContain(password);
        const client = new Client({
          connectionString: roleUrl(migratorUrl, `wallet_${role}`, password),
        });
        await client.connect();
        await client.end();
      }
    });
  });
});

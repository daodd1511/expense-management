import { execFile, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "../../packages/api/src/db/pg";
import { describe, expect, it } from "vitest";
import {
  hasTestDatabase,
  TEST_DATABASE_URL,
  withMigratedDatabase,
} from "../../packages/api/src/db/test-helpers";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const hasAge = spawnSync("age", ["--version"], { stdio: "ignore" }).status === 0;

function databaseUrl(base: string, database: string): string {
  const url = new URL(base);
  url.pathname = `/${database}`;
  return url.toString();
}

describe.skipIf(!hasTestDatabase || !hasAge)("recovery PostgreSQL integration", () => {
  it("restores an encrypted custom archive into a fresh database", async () => {
    await withMigratedDatabase(async ({ migratorUrl, recoveryUrl }) => {
      if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
      const postgresContainer = process.env.TEST_POSTGRES_CONTAINER_ID ?? "wallet-phase2-pg";
      if (!/^[a-zA-Z0-9_.-]+$/.test(postgresContainer)) {
        throw new Error("TEST_POSTGRES_CONTAINER_ID contains unsupported characters");
      }
      const source = new Client({ connectionString: migratorUrl });
      await source.connect();
      await source.query(
        'insert into auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt") values ($1, $2, $2, false, null, now(), now())',
        ["11111111-1111-4111-8111-111111111111", "restore@example.com"],
      );
      await source.end();

      const targetName = `wallet_restore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const targetUrl = databaseUrl(TEST_DATABASE_URL, targetName);
      const admin = new Client({ connectionString: TEST_DATABASE_URL });
      await admin.connect();
      await admin.query(`create database "${targetName}"`);

      const temporary = await mkdtemp(path.join(os.tmpdir(), "wallet-recovery-integration-"));
      const bin = path.join(temporary, "bin");
      const archives = path.join(temporary, "archives");
      const identity = path.join(temporary, "identity.txt");
      await mkdir(bin);
      await writeFile(
        path.join(bin, "pg_dump"),
        `#!/bin/sh\nset -eu\nfor argument in "$@"; do case "$argument" in --file=*) output=\${argument#--file=} ;; postgres://*) url=$argument ;; esac; done\nuser=$(printf "%s" "$url" | sed "s|^[^:]*://||; s|:.*||")\ndatabase=$(printf "%s" "$url" | sed "s|.*/||; s|?.*||")\ndocker exec ${postgresContainer} pg_dump -U "$user" --format=custom --no-owner --schema=auth --schema=public --schema=wallet "$database" > "$output"\n`,
        { mode: 0o700 },
      );
      await writeFile(
        path.join(bin, "pg_restore"),
        `#!/bin/sh\nset -eu\nif [ "$1" = "--list" ]; then docker exec -i ${postgresContainer} pg_restore --list < "$2"; exit 0; fi\nfor argument in "$@"; do case "$argument" in --dbname=*) url=\${argument#--dbname=} ;; *) input=$argument ;; esac; done\nuser=$(printf "%s" "$url" | sed "s|^[^:]*://||; s|:.*||")\ndatabase=$(printf "%s" "$url" | sed "s|.*/||; s|?.*||")\ndocker exec -i ${postgresContainer} pg_restore -U "$user" --exit-on-error --no-owner --dbname="$database" < "$input"\n`,
        { mode: 0o700 },
      );
      await execFileAsync("age-keygen", ["--output", identity]);
      const recipientResult = await execFileAsync("age-keygen", ["-y", identity]);
      const recipient = recipientResult.stdout.trim();

      try {
        const archiveResult = await execFileAsync(
          path.join(repositoryRoot, "tools/recovery/archive.sh"),
          [],
          {
            env: {
              ...process.env,
              PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
              DATABASE_URL: recoveryUrl,
              AGE_RECIPIENT: recipient,
              ARCHIVE_DIR: archives,
              WALLET_ARCHIVE_TIMESTAMP: "20260831T000000Z",
            },
          },
        );
        const archive = archiveResult.stdout.trim();
        const encrypted = await readFile(archive);
        expect(encrypted.toString("utf8", 0, 128)).toContain("age-encryption.org/v1");
        expect(encrypted.includes(Buffer.from("PGDMP"))).toBe(false);
        await execFileAsync(
          path.join(repositoryRoot, "tools/recovery/restore-rehearsal.sh"),
          [archive],
          {
            env: {
              ...process.env,
              PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
              AGE_IDENTITY_FILE: identity,
              RESTORE_DATABASE_URL: targetUrl,
            },
          },
        );

        const target = new Client({ connectionString: targetUrl });
        await target.connect();
        const restored = await target.query<{ email: string }>('select email from auth."user"');
        await target.end();
        expect(restored.rows).toEqual([{ email: "restore@example.com" }]);
      } finally {
        await admin.query(
          "select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()",
          [targetName],
        );
        await admin.query(`drop database if exists "${targetName}"`);
        await admin.end();
      }
    });
  });
});

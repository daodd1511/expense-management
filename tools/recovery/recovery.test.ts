import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../..");

async function executable(file: string, contents: string): Promise<void> {
  await writeFile(file, `#!/bin/sh\nset -eu\n${contents}\n`, { mode: 0o700 });
}

describe("recovery scripts", () => {
  it("publishes only validated encrypted archives and retains 24/14/8 tiers", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "wallet-recovery-test-"));
    const bin = path.join(temporary, "bin");
    const archives = path.join(temporary, "archives");
    await mkdir(bin);
    await executable(
      path.join(bin, "pg_dump"),
      'for argument in "$@"; do case "$argument" in --file=*) output=${argument#--file=} ;; esac; done\nprintf "validated dump" > "$output"',
    );
    await executable(path.join(bin, "pg_restore"), "exit 0");
    await executable(
      path.join(bin, "age"),
      'while [ "$#" -gt 0 ]; do case "$1" in --output) output=$2; shift 2 ;; *) input=$1; shift ;; esac; done\nprintf "age-encryption.org/v1\\n" > "$output"\ncat "$input" >> "$output"',
    );

    const env = {
      ...process.env,
      PATH: `${bin}:/usr/bin:/bin`,
      DATABASE_URL: "postgres://unused",
      AGE_RECIPIENT: "age1testrecipient",
      ARCHIVE_DIR: archives,
    };
    for (let day = 1; day <= 70; day += 1) {
      const date = new Date(Date.UTC(2026, 0, day));
      const compact = date.toISOString().slice(0, 10).replaceAll("-", "");
      await execFileAsync(path.join(repositoryRoot, "tools/recovery/archive.sh"), [], {
        env: { ...env, WALLET_ARCHIVE_TIMESTAMP: `${compact}T000000Z` },
      });
    }

    const archiveNames = async (tier: string): Promise<string[]> =>
      (await readdir(path.join(archives, tier))).filter((name) => name.endsWith(".dump.age"));
    expect(await archiveNames("hourly")).toHaveLength(24);
    expect(await archiveNames("daily")).toHaveLength(14);
    expect(await archiveNames("weekly")).toHaveLength(8);
    expect((await readdir(archives)).some((name) => name.startsWith(".wallet-archive"))).toBe(
      false,
    );

    const newest = (await archiveNames("hourly")).sort().at(-1);
    expect(newest).toBeTruthy();
    const encrypted = path.join(archives, "hourly", newest ?? "missing");
    expect(await readFile(encrypted, "utf8")).toBe("age-encryption.org/v1\nvalidated dump");
    expect(await readFile(`${encrypted}.sha256`, "utf8")).toContain(newest);
  }, 60_000);

  it("does not publish an archive when checksum generation fails", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "wallet-checksum-test-"));
    const bin = path.join(temporary, "bin");
    const archives = path.join(temporary, "archives");
    await mkdir(bin);
    await executable(
      path.join(bin, "pg_dump"),
      'for argument in "$@"; do case "$argument" in --file=*) output=${argument#--file=} ;; esac; done\nprintf "validated dump" > "$output"',
    );
    await executable(path.join(bin, "pg_restore"), "exit 0");
    await executable(
      path.join(bin, "age"),
      'while [ "$#" -gt 0 ]; do case "$1" in --output) output=$2; shift 2 ;; *) input=$1; shift ;; esac; done\ncp "$input" "$output"',
    );
    await executable(path.join(bin, "shasum"), "exit 1");

    await expect(
      execFileAsync(path.join(repositoryRoot, "tools/recovery/archive.sh"), [], {
        env: {
          ...process.env,
          PATH: `${bin}:/usr/bin:/bin`,
          DATABASE_URL: "postgres://unused",
          AGE_RECIPIENT: "age1testrecipient",
          ARCHIVE_DIR: archives,
          WALLET_ARCHIVE_TIMESTAMP: "20260831T000000Z",
        },
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("failed to calculate encrypted archive checksum"),
    });
    expect(await readdir(path.join(archives, "hourly"))).toEqual([]);
    expect((await readdir(archives)).some((name) => name.startsWith(".wallet-archive"))).toBe(
      false,
    );
  });

  it("rejects a restore when the encrypted archive checksum differs", async () => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "wallet-restore-test-"));
    const bin = path.join(temporary, "bin");
    const archive = path.join(temporary, "wallet.dump.age");
    const identity = path.join(temporary, "identity.txt");
    await mkdir(bin);
    for (const command of ["age", "pg_restore", "psql"]) {
      await executable(path.join(bin, command), "exit 0");
    }
    await writeFile(archive, "changed", { mode: 0o600 });
    await writeFile(`${archive}.sha256`, `deadbeef  ${path.basename(archive)}\n`, { mode: 0o600 });
    await writeFile(identity, "test identity", { mode: 0o600 });

    await expect(
      execFileAsync(path.join(repositoryRoot, "tools/recovery/restore-rehearsal.sh"), [archive], {
        env: {
          ...process.env,
          PATH: `${bin}:/usr/bin:/bin`,
          AGE_IDENTITY_FILE: identity,
          RESTORE_DATABASE_URL: "postgres://unused",
        },
      }),
    ).rejects.toMatchObject({ stderr: expect.stringContaining("archive checksum mismatch") });
  });
});

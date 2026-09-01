import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const ENTRYPOINT = "tools/ops/entrypoint.sh";

describe("wallet-ops entrypoint", () => {
  it("lists the fixed operational command surface", async () => {
    const result = await execFileAsync(ENTRYPOINT, ["help"]);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("bootstrap");
    expect(result.stdout).toContain("migrate");
    expect(result.stdout).toContain("archive");
    expect(result.stdout).toContain("cutover-set-password");
  });

  it("rejects arbitrary command execution", async () => {
    await expect(execFileAsync(ENTRYPOINT, ["sh", "-c", "id"])).rejects.toMatchObject({
      code: 64,
      stderr: "Unknown wallet-ops command: sh\n",
    });
  });

  it("fails before Dbmate when the runtime connection is absent", async () => {
    await expect(
      execFileAsync(ENTRYPOINT, ["migrate"], {
        env: { ...process.env, DATABASE_URL: "" },
      }),
    ).rejects.toMatchObject({
      code: 1,
    });
  });
});

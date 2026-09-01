import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "../../packages/api/src/db/pg";
import { compareManifests, createManifest, readDataset } from "./manifest";
import { readArtifact } from "./import";

function argument(argv: string[], name: string, required = true): string | undefined {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (required && (!value || value.startsWith("-"))) {
    throw new Error(`Missing ${name}`);
  }
  return value ? path.resolve(value) : undefined;
}

export async function validateTarget(sourceFile: string, databaseUrl: string): Promise<string[]> {
  const source = await readArtifact(sourceFile);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const target = await readDataset(client);
    const differences = compareManifests(source.manifest, createManifest(target));
    await client.query("commit");
    return differences;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.TARGET_DATABASE_URL;
  if (!databaseUrl) throw new Error("TARGET_DATABASE_URL is required");
  const argv = process.argv.slice(2);
  const source = argument(argv, "--source");
  const output = argument(argv, "--output", false);
  if (!source) throw new Error("Missing --source");
  const differences = await validateTarget(source, databaseUrl);
  const report = {
    checkedAt: new Date().toISOString(),
    source,
    status: differences.length === 0 ? "match" : "mismatch",
    differences,
  };
  if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  if (differences.length > 0) {
    throw new Error(`Cutover validation failed:\n- ${differences.join("\n- ")}`);
  }
  process.stdout.write("Cutover validation passed with exact manifest equality\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Cutover validation failed"}\n`,
    );
    process.exitCode = 1;
  });
}

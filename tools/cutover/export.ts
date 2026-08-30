import { access, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "../../packages/api/src/db/pg";
import { createManifest, readSupabaseDataset, type CutoverArtifact } from "./manifest";

function outputArgument(argv: string[]): string {
  const index = argv.indexOf("--output");
  const output = index >= 0 ? argv[index + 1] : undefined;
  if (!output || output.startsWith("-")) {
    throw new Error("Usage: pnpm cutover:export -- --output <new-json-file>");
  }
  return path.resolve(output);
}

async function writeArtifact(output: string, artifact: CutoverArtifact): Promise<void> {
  await access(output).then(
    () => Promise.reject(new Error(`Refusing to overwrite existing export ${output}`)),
    () => undefined,
  );
  const temporary = `${output}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, `${JSON.stringify(artifact, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, output);
  } catch (error) {
    await import("node:fs/promises").then(({ rm }) => rm(temporary, { force: true }));
    throw error;
  }
}

export async function exportCutoverArtifact(databaseUrl: string): Promise<CutoverArtifact> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const dataset = await readSupabaseDataset(client);
    const artifact = { dataset, manifest: createManifest(dataset) } satisfies CutoverArtifact;
    await client.query("commit");
    return artifact;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.SOURCE_DATABASE_URL;
  if (!databaseUrl) throw new Error("SOURCE_DATABASE_URL is required");
  const output = outputArgument(process.argv.slice(2));
  const artifact = await exportCutoverArtifact(databaseUrl);
  await writeArtifact(output, artifact);
  process.stdout.write(
    `Wrote frozen cutover artifact with ${artifact.dataset.identities.length} identities to ${output}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Cutover export failed"}\n`);
    process.exitCode = 1;
  });
}

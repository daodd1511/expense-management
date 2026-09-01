import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import { Client, type ClientBase } from "../../packages/api/src/db/pg";
import { hashPassword } from "../../packages/api/src/auth/password";

function userIdArgument(argv: string[]): string {
  if (argv.length !== 2 || argv[0] !== "--user-id" || !argv[1]) {
    throw new Error("Usage: pnpm cutover:set-password -- --user-id <preserved-user-uuid>");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(argv[1])) {
    throw new Error("--user-id must be a UUID");
  }
  return argv[1];
}

async function hiddenPrompt(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Password entry requires an interactive TTY");
  }
  stdout.write(label);
  stdin.setEncoding("utf8");
  stdin.setRawMode(true);
  stdin.resume();
  try {
    return await new Promise<string>((resolve, reject) => {
      let value = "";
      const onData = (chunk: string): void => {
        for (const character of chunk) {
          if (character === "\u0003") {
            stdin.off("data", onData);
            reject(new Error("Password entry cancelled"));
            return;
          }
          if (character === "\r" || character === "\n") {
            stdin.off("data", onData);
            stdout.write("\n");
            resolve(value);
            return;
          }
          if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
          else if (character >= " ") value += character;
        }
      };
      stdin.on("data", onData);
    });
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
  }
}

export async function setCutoverPassword(
  client: ClientBase,
  userId: string,
  password: string,
  confirmation: string,
): Promise<void> {
  if (password !== confirmation) throw new Error("Passwords do not match");
  if (password.length < 8 || password.length > 128) {
    throw new Error("Password must contain between 8 and 128 characters");
  }

  const passwordHash = await hashPassword(password);
  await client.query("begin");
  try {
    const user = await client.query('select id from auth."user" where id = $1 for update', [
      userId,
    ]);
    if (user.rowCount !== 1) throw new Error("Preserved User does not exist");
    const credential = await client.query<{ id: string }>(
      'select id from auth."account" where "userId" = $1 and "providerId" = \'credential\' for update',
      [userId],
    );
    if ((credential.rowCount ?? 0) > 1) throw new Error("User has duplicate credential accounts");
    if (credential.rows[0]) {
      await client.query(
        'update auth."account" set password = $1, "updatedAt" = now() where id = $2',
        [passwordHash, credential.rows[0].id],
      );
    } else {
      await client.query(
        'insert into auth."account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") values ($1, $2::text, \'credential\', $2::uuid, $3, now(), now())',
        [randomUUID(), userId, passwordHash],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.AUTH_DATABASE_URL;
  if (!databaseUrl) throw new Error("AUTH_DATABASE_URL is required");
  const userId = userIdArgument(process.argv.slice(2));
  const password = await hiddenPrompt("New password: ");
  const confirmation = await hiddenPrompt("Confirm password: ");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await setCutoverPassword(client, userId, password, confirmation);
  } finally {
    await client.end();
  }
  process.stdout.write(`Credential account updated for User ${userId}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Password update failed"}\n`);
    process.exitCode = 1;
  });
}

import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  sql,
} from "kysely";
import { Client } from "pg";
import { createApp } from "../app";
import { createAppDatabase, type AppDatabase, type Database } from "../db/database";
import { withMigratedDatabase } from "../db/test-helpers";

export const USER_A = "11111111-1111-1111-1111-111111111111";
export const USER_B = "22222222-2222-2222-2222-222222222222";

/** Query-builder-only executor for service tests whose repository calls are mocked. */
export const DUMMY_DB = new Kysely<Database>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
});

export type ApiTestContext = {
  app: ReturnType<typeof createApp>;
  database: AppDatabase;
  migrator: Client;
  request(userId: string | null, path: string, init?: RequestInit): Promise<Response>;
};

export function jsonRequest(
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  };
}

export function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function createTestAccount(
  context: ApiTestContext,
  userId: string,
  name = "Test account",
) {
  const response = await context.request(
    userId,
    "/api/accounts",
    jsonRequest("POST", { name, kind: "bank", openingBalance: 1_000 }),
  );
  if (response.status !== 201) {
    throw new Error(`createTestAccount failed with ${response.status}: ${await response.text()}`);
  }
  const body = await readJson<{ data: { id: string; displayOrder: number } }>(response);
  return body.data;
}

export async function createTestCategory(
  context: ApiTestContext,
  userId: string,
  input: { name: string; type?: "expense" | "income"; parentId?: string | null },
) {
  const response = await context.request(
    userId,
    "/api/categories",
    jsonRequest("POST", {
      name: input.name,
      icon: "Circle",
      color: "chart-1",
      type: input.type ?? "expense",
      parentId: input.parentId ?? null,
    }),
  );
  if (response.status !== 201) {
    throw new Error(`createTestCategory failed with ${response.status}: ${await response.text()}`);
  }
  const body = await readJson<{ data: { id: string; parentId: string | null } }>(response);
  return body.data;
}

/** Runs an API integration scenario against a clean migrated PostgreSQL database. */
export async function withApiTestDatabase<T>(work: (context: ApiTestContext) => Promise<T>) {
  return withMigratedDatabase(async ({ migratorUrl, appUrl }) => {
    const migrator = new Client({ connectionString: migratorUrl });
    await migrator.connect();
    const database = createAppDatabase(appUrl);

    try {
      await migrator.query(
        `insert into auth."user" (id, name, email, "emailVerified") values
          ($1, 'User A', 'a@example.com', true),
          ($2, 'User B', 'b@example.com', true)`,
        [USER_A, USER_B],
      );

      const app = createApp({
        resolveIdentity: async (c) => {
          const userId = c.req.header("x-test-user-id");
          return userId === USER_A || userId === USER_B ? userId : null;
        },
        runWithTransaction: database.withAppTransaction,
        checkReadiness: async () => {
          await sql`select max(version) from public.schema_migrations`.execute(database.db);
        },
      });

      return await work({
        app,
        database,
        migrator,
        async request(userId, path, init = {}) {
          const headers = new Headers(init.headers);
          if (userId) headers.set("x-test-user-id", userId);
          return await app.request(path, { ...init, headers });
        },
      });
    } finally {
      await database.close();
      await migrator.end();
    }
  });
}

import { Client } from "../../packages/api/src/db/pg";
import { describe, expect, it } from "vitest";
import { verifyPassword } from "../../packages/api/src/auth/password";
import { hasTestDatabase, withMigratedDatabase } from "../../packages/api/src/db/test-helpers";
import { importDataset } from "./import";
import { compareManifests, createManifest, readDataset, readSupabaseDataset } from "./manifest";
import { setCutoverPassword } from "./set-password";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const CATEGORY_ID = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const TRANSACTION_ID = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const PERSON_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const LOAN_ID = "ffffffff-ffff-4fff-8fff-fffffffffff1";

describe.skipIf(!hasTestDatabase)("cutover PostgreSQL integration", () => {
  it("preserves UUIDs, relationships, manifests, functions, and Better Auth credentials", async () => {
    await withMigratedDatabase(async ({ migratorUrl }) => {
      const client = new Client({ connectionString: migratorUrl });
      await client.connect();
      try {
        await client.query(
          'insert into auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt") values ($1, $2, $2, false, null, $3, $3)',
          [USER_ID, "person@example.com", "2026-08-01T00:00:00.000Z"],
        );
        await client.query(`
          create table auth.users (
            id uuid primary key,
            email text,
            email_confirmed_at timestamptz,
            created_at timestamptz not null,
            updated_at timestamptz
          )
        `);
        await client.query(
          "insert into auth.users (id, email, email_confirmed_at, created_at, updated_at) values ($1, ' Person@Example.COM ', null, $2, $2)",
          [USER_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.accounts (id, owner_id, name, kind, opening_balance, archived, created_at, display_order) values ($1, $2, 'Cash', 'cash', 1000, false, $3, 0)",
          [ACCOUNT_ID, USER_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.categories (id, owner_id, name, icon, color, created_at, type, parent_id, is_hidden) values ($1, $2, 'Food', 'food', 'red', $3, 'expense', null, false)",
          [CATEGORY_ID, USER_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.budgets (owner_id, category_id, amount, created_at, scope) values ($1, $2, 500, $3, 'self')",
          [USER_ID, CATEGORY_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.category_favorites (user_id, category_id, created_at) values ($1, $2, $3)",
          [USER_ID, CATEGORY_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.subscriptions (owner_id, name, amount, type, category_id, account_id, cadence, day_of_month, month_of_year, next_due_date, note, active, created_at) values ($1, 'Rent', 300, 'expense', $2, $3, 'monthly', 1, 1, '2026-09-01', null, true, $4)",
          [USER_ID, CATEGORY_ID, ACCOUNT_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.loan_people (id, owner_id, name, note, created_at) values ($1, $2, 'Alex', null, $3)",
          [PERSON_ID, USER_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.loans (id, owner_id, person_id, direction, description, note, due_date, original_date, created_at) values ($1, $2, $3, 'lending', null, null, null, '2026-08-01', $4)",
          [LOAN_ID, USER_ID, PERSON_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.loan_events (owner_id, loan_id, kind, amount, event_date, created_at) values ($1, $2, 'opening', 700, '2026-08-01', $3), ($1, $2, 'repayment', 200, '2026-08-03', $3)",
          [USER_ID, LOAN_ID, "2026-08-01T00:00:00.000Z"],
        );
        await client.query(
          "insert into public.transactions (id, owner_id, type, amount, category_id, account_id, merchant, note, tx_date, created_at, tx_time) values ($1, $2, 'expense', 250, $3, $4, 'Market', null, '2026-08-02', $5, '08:00:00')",
          [TRANSACTION_ID, USER_ID, CATEGORY_ID, ACCOUNT_ID, "2026-08-02T01:00:00.000Z"],
        );

        const source = await readSupabaseDataset(client);
        const sourceManifest = createManifest(source);
        expect(source.identities).toEqual([
          expect.objectContaining({
            id: USER_ID,
            email: "person@example.com",
            name: "person@example.com",
            image: null,
          }),
        ]);

        await client.query('truncate auth."user" cascade');
        await importDataset(client, source);

        const target = await readDataset(client);
        expect(target.tables.transactions).toEqual(source.tables.transactions);
        expect(compareManifests(sourceManifest, createManifest(target))).toEqual([]);
        expect(target.identities.map(({ id }) => id)).toContain(USER_ID);
        expect(target.tables.transactions.find(({ id }) => id === TRANSACTION_ID)).toMatchObject({
          owner_id: USER_ID,
          account_id: ACCOUNT_ID,
          category_id: CATEGORY_ID,
        });
        expect(createManifest(target).financialByUser[USER_ID]?.loanBalances[LOAN_ID]).toBe("500");

        const functions = await client.query<{ name: string }>(
          "select distinct p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any($1::text[]) order by p.proname",
          [
            [
              "reorder_accounts",
              "create_transfer_with_fee",
              "log_subscription",
              "create_disbursed_loan",
              "create_opening_loan",
              "create_loan_repayment",
              "update_loan_repayment",
              "update_loan_disbursement",
              "close_loan",
            ],
          ],
        );
        expect(functions.rows).toHaveLength(9);

        const password = "correct-horse-battery-staple";
        await setCutoverPassword(client, USER_ID, password, password);
        const credential = await client.query<{ password: string }>(
          'select password from auth."account" where "userId" = $1 and "providerId" = \'credential\'',
          [USER_ID],
        );
        expect(credential.rows).toHaveLength(1);
        expect(credential.rows[0]?.password).not.toContain(password);
        expect(await verifyPassword({ hash: credential.rows[0]?.password ?? "", password })).toBe(
          true,
        );
      } finally {
        await client.end();
      }
    });
  });
});

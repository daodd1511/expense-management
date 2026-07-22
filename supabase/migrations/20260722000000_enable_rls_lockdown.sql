-- Enable Row Level Security on every application table.
--
-- Why: all tables live in the `public` schema, which Supabase exposes through
-- the Data API (PostgREST). Without RLS, the `anon` and `authenticated` roles
-- reachable via the publishable key shipped in the web bundle can read and
-- write every user's rows directly, bypassing the API. Enabling RLS with NO
-- policies denies all access to those roles (default-deny).
--
-- This is safe for this architecture: the only legitimate database caller is
-- the API process, which connects with the secret key -> `service_role`, and
-- `service_role` bypasses RLS. The web client uses Supabase solely for Auth
-- (the `auth` schema), never querying these `public` tables directly.
--
-- If a future feature ever lets clients talk to the Data API directly, that
-- table needs explicit per-user policies (e.g. `owner_id = auth.uid()`) added
-- here — default-deny is a lockdown, not a policy set.
--
-- `if exists` guards let this run even though the base-table schema
-- (accounts/transactions/categories/budgets/subscriptions) was created
-- out-of-band and is not reproduced by an earlier migration.

alter table if exists accounts enable row level security;
alter table if exists transactions enable row level security;
alter table if exists categories enable row level security;
alter table if exists category_translations enable row level security;
alter table if exists category_favorites enable row level security;
alter table if exists budgets enable row level security;
alter table if exists subscriptions enable row level security;
alter table if exists loans enable row level security;
alter table if exists loan_people enable row level security;
alter table if exists loan_events enable row level security;

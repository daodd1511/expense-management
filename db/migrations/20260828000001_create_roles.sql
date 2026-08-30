-- migrate:up

-- Restricted-privilege roles for the target runtime (ADR-0008, ADR-0010).
--
-- `wallet_migrator` is not created here: it is the initial role the PostgreSQL
-- container provisions from POSTGRES_USER and already owns every schema. It runs
-- Dbmate and is the only role with DDL privileges.
--
-- Neither role below is given a password by this migration. Passwords are set
-- out-of-band at deploy time from secrets (Phase 5's job) so no credential is ever
-- embedded in a migration file or the Dbmate ledger.
--
-- Roles live cluster-wide, not per-database, but Dbmate's applied-migrations ledger is
-- per-database — so a second database in the same cluster (a disaster-recovery
-- rebuild, or this repo's own per-test scratch databases) replaying this migration
-- would otherwise hit "role already exists". Guard each `CREATE ROLE` accordingly.

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_auth') THEN
    CREATE ROLE wallet_auth LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    COMMENT ON ROLE wallet_auth IS
      'Better Auth runtime pool: DML on the auth schema only, no access to financial tables.';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_app') THEN
    CREATE ROLE wallet_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    COMMENT ON ROLE wallet_app IS
      'Hono API application-data pool: restricted DML on public tables, RLS-enforced, no DDL.';
  END IF;
END $$;

-- migrate:down

-- Roles are cluster-wide while migrations run per database. Later down migrations
-- revoke this database's grants, but these principals must remain because another
-- database in the same cluster may still depend on them.

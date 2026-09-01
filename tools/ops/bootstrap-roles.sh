#!/bin/sh
set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${WALLET_MIGRATOR_PASSWORD:?WALLET_MIGRATOR_PASSWORD is required}"
: "${WALLET_APP_PASSWORD:?WALLET_APP_PASSWORD is required}"
: "${WALLET_AUTH_PASSWORD:?WALLET_AUTH_PASSWORD is required}"
: "${WALLET_RECOVERY_PASSWORD:?WALLET_RECOVERY_PASSWORD is required}"

psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'role bootstrap requires a PostgreSQL superuser';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_migrator') THEN
    CREATE ROLE wallet_migrator LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_app') THEN
    CREATE ROLE wallet_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_auth') THEN
    CREATE ROLE wallet_auth LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_recovery') THEN
    CREATE ROLE wallet_recovery LOGIN;
  END IF;
END $$;

\set wallet_migrator_password `printf '%s' "$WALLET_MIGRATOR_PASSWORD"`
\set wallet_app_password `printf '%s' "$WALLET_APP_PASSWORD"`
\set wallet_auth_password `printf '%s' "$WALLET_AUTH_PASSWORD"`
\set wallet_recovery_password `printf '%s' "$WALLET_RECOVERY_PASSWORD"`

ALTER ROLE wallet_migrator
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS
  PASSWORD :'wallet_migrator_password';
ALTER ROLE wallet_app
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS
  PASSWORD :'wallet_app_password';
ALTER ROLE wallet_auth
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS
  PASSWORD :'wallet_auth_password';
ALTER ROLE wallet_recovery
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS
  PASSWORD :'wallet_recovery_password';

COMMENT ON ROLE wallet_migrator IS
  'Dbmate schema owner: database-local DDL only, no cluster role management.';
COMMENT ON ROLE wallet_auth IS
  'Better Auth runtime pool: DML on the auth schema only, no access to financial tables.';
COMMENT ON ROLE wallet_app IS
  'Hono API application-data pool: restricted DML on public tables, RLS-enforced, no DDL.';
COMMENT ON ROLE wallet_recovery IS
  'Read-only pg_dump principal for the auth, public, and wallet schemas.';

SELECT format('ALTER DATABASE %I OWNER TO wallet_migrator', current_database()) \gexec
SQL

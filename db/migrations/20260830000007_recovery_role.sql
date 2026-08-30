-- migrate:up

-- Read-only backup principal. The password is injected after migration by the
-- deployment environment; migrations never contain credentials.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_recovery') THEN
    CREATE ROLE wallet_recovery LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
    COMMENT ON ROLE wallet_recovery IS
      'Read-only pg_dump principal for the auth, public, and wallet schemas.';
  END IF;
END $$;

-- pg_dump deliberately refuses to copy an RLS-protected table as a role affected by
-- its policies. BYPASSRLS is therefore required for a complete backup; explicit
-- read-only grants below still prevent every application/auth write and all DDL.
ALTER ROLE wallet_recovery BYPASSRLS;

DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO wallet_recovery', current_database());
END $$;

GRANT USAGE ON SCHEMA auth, public, wallet TO wallet_recovery;
GRANT SELECT ON ALL TABLES IN SCHEMA auth, public TO wallet_recovery;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA auth, public TO wallet_recovery;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth, public
  GRANT SELECT ON TABLES TO wallet_recovery;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, public
  GRANT SELECT ON SEQUENCES TO wallet_recovery;

-- migrate:down

ALTER DEFAULT PRIVILEGES IN SCHEMA auth, public
  REVOKE SELECT ON SEQUENCES FROM wallet_recovery;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, public
  REVOKE SELECT ON TABLES FROM wallet_recovery;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA auth, public FROM wallet_recovery;
REVOKE ALL ON ALL TABLES IN SCHEMA auth, public FROM wallet_recovery;
REVOKE USAGE ON SCHEMA auth, public, wallet FROM wallet_recovery;
ALTER ROLE wallet_recovery NOBYPASSRLS;
DO $$ BEGIN
  EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM wallet_recovery', current_database());
END $$;
DROP ROLE IF EXISTS wallet_recovery;

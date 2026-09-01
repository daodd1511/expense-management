-- migrate:up

-- pg_dump deliberately refuses to copy an RLS-protected table as a role affected by
-- its policies. The administrator bootstrap therefore grants wallet_recovery
-- BYPASSRLS before Dbmate runs; explicit database-local grants below still prevent
-- every application/auth write and all DDL.

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
DO $$ BEGIN
  EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM wallet_recovery', current_database());
END $$;

-- Roles are cluster-wide while migrations run per database. Keep the principal and
-- its BYPASSRLS attribute: another database in the same cluster may still depend on
-- it for recovery. This down migration removes only this database's privileges.

-- migrate:up

-- Cluster roles are an administrator-owned precondition, not database-local migration
-- state. The wallet-ops bootstrap creates them, assigns credentials, grants BYPASSRLS
-- only to recovery, and transfers this database to the restricted wallet_migrator.
-- Dbmate then manages schemas, grants, policies, and functions without a superuser.
DO $$
DECLARE
  missing_roles text;
BEGIN
  IF current_user <> 'wallet_migrator' THEN
    RAISE EXCEPTION 'Dbmate must run as wallet_migrator, not %', current_user;
  END IF;

  SELECT string_agg(required.name, ', ' ORDER BY required.name)
    INTO missing_roles
  FROM (VALUES ('wallet_app'), ('wallet_auth'), ('wallet_recovery')) AS required(name)
  LEFT JOIN pg_roles roles ON roles.rolname = required.name
  WHERE roles.oid IS NULL;

  IF missing_roles IS NOT NULL THEN
    RAISE EXCEPTION 'administrator bootstrap did not create roles: %', missing_roles;
  END IF;
END $$;

-- migrate:down

-- Cluster roles remain administrator-owned and outlive database-local rollbacks.

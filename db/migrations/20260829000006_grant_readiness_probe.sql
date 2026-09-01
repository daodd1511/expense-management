-- migrate:up

-- The application readiness probe reads only the applied migration version. Keep this
-- narrower than table-level SELECT so wallet_app cannot inspect future metadata columns.
GRANT SELECT (version) ON public.schema_migrations TO wallet_app;

-- migrate:down

REVOKE SELECT (version) ON public.schema_migrations FROM wallet_app;

# Self-hosting contract

This repository owns the application images and a local/manual PostgreSQL 17 runtime contract. It does not own production orchestration. The deploy repository's `/Users/thomasduong/dev/personal/deploy/docs/specs/wallet-supabase-exit/EXECUTION.md` controls production Compose, secret staging, rehearsal, maintenance-window cutover, rollback, and user-confirmed hosted-project retirement.

## Local architecture

`docker-compose.yml` starts these services in dependency order:

1. `postgres` runs PostgreSQL 17 with a persistent local volume and a loopback-only development port.
2. `migrator` runs the complete Dbmate chain once after PostgreSQL becomes healthy.
3. `role-bootstrap` injects distinct runtime passwords after migrations create the `wallet_app`, `wallet_auth`, and `wallet_recovery` roles.
4. `api` receives only the application/auth connection URLs and Better Auth runtime secret. Its health check uses `/health/ready`, which requires the current Dbmate version.
5. `web` receives only `/api` and public build metadata. Its image and browser bundle contain no database credential.
6. `recovery` is a manual Compose profile that connects as read-only `wallet_recovery`, writes encrypted archives to the same-host recovery volume, and exits. PostgreSQL requires this role to hold `BYPASSRLS` so `pg_dump` can include every owner's rows; it remains non-superuser and has no write or DDL grant.
7. `cloudflared` starts only after the web and API readiness chain succeeds.

Use a dedicated local `.env` copied from `.env.example`. Generate distinct random values for the migrator, application, auth, and recovery passwords. Never give a `VITE_` prefix to a database URL, password, Better Auth secret, tunnel token, or recovery identity.

## Local start and verification

Start from an empty volume when validating the complete bootstrap contract:

```sh
docker compose up -d postgres migrator role-bootstrap api web
docker compose ps
curl --fail http://127.0.0.1:${POSTGRES_PORT:-5432} >/dev/null 2>&1 || true
```

The database port check only confirms the loopback listener exists. Treat `api` as ready only when its container health check succeeds. `web` waits for that readiness state.

Run an encrypted same-host recovery point explicitly:

```sh
docker compose --profile recovery run --rm recovery
```

The local recovery volume is not off-host durability. Follow [`docs/recovery-archives.md`](../recovery-archives.md) for archive validation, restore rehearsal, retention limits, and manual off-host copying.

## Published images

- `packages/api/Dockerfile` bundles the Node API, runs as the unprivileged `node` user, and includes no migration files or credentials.
- `packages/web/Dockerfile` builds the SPA with only public values and serves it from nginx.
- `tools/recovery/Dockerfile` contains PostgreSQL client tools, `age`, and the reviewed recovery scripts; it runs as the unprivileged `postgres` user.

`.github/workflows/build.yml` publishes the API and web images after CI succeeds on `main`. It does not deploy them directly. The deploy repository consumes immutable commit tags and owns rollback.

## CI boundary

`.github/workflows/ci.yml` provisions PostgreSQL 17, installs `age`, and runs the complete test command with the database integration environment enabled. CI requires no Supabase service or credential. The recovery integration generates an ephemeral `age` keypair and restores a real custom-format archive.

## Production boundary

Do not copy local Compose values into production or edit production Compose from this repository. Production must stage independent secrets, run cutover export/import/exact validation and encrypted restore rehearsal, keep writes closed on any failure, and reopen traffic only through the deploy spec's user-review lane. Hosted-project deletion remains a separate, explicit user-confirmed step after rollback criteria expire.

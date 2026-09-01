# Self-hosting contract

This repository owns the application images and a local/manual PostgreSQL 17 runtime contract. It does not own production orchestration. The deploy repository's `/Users/thomasduong/dev/personal/deploy/docs/specs/wallet-supabase-exit/EXECUTION.md` controls production Compose, secret staging, rehearsal, maintenance-window cutover, rollback, and user-confirmed hosted-project retirement.

## Local architecture

`docker-compose.yml` starts these services in dependency order:

1. `postgres` runs PostgreSQL 17 with a persistent local volume, a loopback-only development port, and a dedicated container-administrator credential.
2. `role-bootstrap` uses that administrator credential once to create the restricted `wallet_migrator`, `wallet_app`, `wallet_auth`, and `wallet_recovery` cluster roles, assign distinct passwords, grant `BYPASSRLS` only to recovery, and transfer database ownership to the migrator.
3. `migrator` runs the bundled Dbmate chain as non-superuser `wallet_migrator` after bootstrap succeeds.
4. `api` receives only the application/auth connection URLs and Better Auth runtime secret. Its health check uses `/health/ready`, which requires the current Dbmate version.
5. `web` receives only `/api` and public build metadata. Its image and browser bundle contain no database credential.
6. `recovery` is a manual Compose profile that connects as read-only `wallet_recovery`, writes encrypted archives to the same-host recovery volume, and exits. PostgreSQL requires this role to hold `BYPASSRLS` so `pg_dump` can include every owner's rows; it remains non-superuser and has no write or DDL grant.
7. `cloudflared` starts only after the web and API readiness chain succeeds.

Use a dedicated local `.env` copied from `.env.example`. Generate distinct URL-safe alphanumeric values for the migrator, application, auth, and recovery passwords because Compose embeds them directly in PostgreSQL URLs. Never give a `VITE_` prefix to a database URL, password, Better Auth secret, tunnel token, or recovery identity.

## Local start and verification

Start from an empty volume when validating the complete bootstrap contract:

```sh
docker compose up -d postgres role-bootstrap migrator api web
docker compose ps
docker compose exec postgres pg_isready -U wallet_admin -d "${POSTGRES_DB:-wallet}"
```

The database check confirms PostgreSQL accepts connections. Treat `api` as ready only when its container health check succeeds. `web` waits for that readiness state.

Run an encrypted same-host recovery point explicitly:

```sh
docker compose --profile recovery run --rm recovery
```

The local recovery volume is not off-host durability. Follow [`docs/recovery-archives.md`](../recovery-archives.md) for archive validation, restore rehearsal, retention limits, and manual off-host copying.

## Published images

- `packages/api/Dockerfile` bundles the Node API, runs as the unprivileged `node` user, and includes no migration files or credentials.
- `packages/web/Dockerfile` builds the SPA with only public values and serves it from nginx.
- `tools/ops/Dockerfile` bundles Dbmate migrations, administrator bootstrap, cutover commands, PostgreSQL client tools, `age`, and recovery commands; it contains no credentials and runs as the unprivileged `postgres` operating-system user.

`.github/workflows/build.yml` publishes API, web, and operations images under the same commit SHA after CI succeeds on `main`; dispatch waits for all three. It does not deploy them directly. The deploy repository consumes immutable commit tags and owns rollback.

The public operations image exposes strict commands rather than arbitrary production configuration: `bootstrap`, `migrate`, `migrate-status`, `archive`, `restore-rehearsal`, and the four `cutover-*` commands. Compose gives each invocation only the credential required for that operation. Production exports, archives, reports, `.env` files, and the `age` private key are runtime mounts or operator inputs and must never enter an image layer.

## CI boundary

`.github/workflows/ci.yml` provisions PostgreSQL 17, installs `age`, and runs the complete test command with the database integration environment enabled. CI requires no Supabase service or credential. The recovery integration generates an ephemeral `age` keypair and restores a real custom-format archive.

## Production boundary

Do not copy local Compose values into production or edit production Compose from this repository. Production must stage independent secrets, run cutover export/import/exact validation and encrypted restore rehearsal, keep writes closed on any failure, and reopen traffic only through the deploy spec's user-review lane. Hosted-project deletion remains a separate, explicit user-confirmed step after rollback criteria expire.

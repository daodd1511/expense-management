# Supabase exit — Plan

Produced via `/grill-with-docs`. All migration decisions below were explicitly confirmed.

## Goal

Move the complete production database and identity system from Supabase to the home server without
changing financial features or ownership semantics. After cutover, dedicated PostgreSQL and Better
Auth are the only database and identity runtime; the application has no Supabase dependency.

## Scope

This spec covers one atomic platform replacement:

- Run a dedicated Wallet PostgreSQL 17 service and persistent volume in the Wallet Compose stack.
- Replace Supabase Auth with Better Auth email/password authentication and PostgreSQL-backed
  server sessions.
- Replace Supabase PostgREST access with `pg` and Kysely inside the Hono API.
- Establish a complete raw-SQL schema baseline and apply future migrations with Dbmate.
- Preserve every existing User UUID and every financial row exactly, especially Transactions and
  their relationships.
- Enforce private User ownership with PostgreSQL Row-Level Security (RLS).
- Perform a maintenance-window cutover, validate the result, and decommission Supabase.
- Add encrypted rotating database recovery archives and document restoration.

The cutover is intentionally one spec because database foreign keys, User IDs, authentication,
repository access, and production deployment must switch together. Splitting them would create an
unsupported mixed Supabase/local runtime.

## Current-state findings

- The web app uses Supabase Auth for Google OAuth, email/password signup and sign-in, password
  recovery, session persistence, and bearer access tokens.
- The Hono API verifies Supabase JWTs and uses a Supabase service credential for all application
  data access. The browser does not query financial tables directly.
- The API repositories use PostgREST queries and nine PostgreSQL remote procedure calls (RPCs).
- No application code uses Supabase Storage or Realtime.
- The checked-in Supabase migrations are not a complete bootstrap chain: the first migration
  assumes the original Accounts, Transactions, Categories, Budgets, and Subscriptions tables
  already exist.
- The live Supabase database reports PostgreSQL `17.6.1.127`, so the replacement remains on major
  version 17.
- Production already serves the web app and API from one hostname behind nginx and Cloudflare
  Tunnel, which supports same-origin session cookies without exposing PostgreSQL publicly.

## Confirmed decisions

| Topic | Decision |
|---|---|
| Replacement boundary | Replace the Supabase database, PostgREST client, JWT authentication, packages, configuration, secrets, migrations, and hosted project. |
| Database | Use the official `postgres:17-bookworm` image in a dedicated Wallet service and volume. Do not share the home server's existing PostgreSQL service. |
| Public boundary | The browser calls only the same-origin Hono API. PostgreSQL has no public or host-published port. |
| Authentication | Use Better Auth with public email/password signup and sign-in. Keep immediate access without email verification. |
| Deferred auth features | Do not migrate Google OAuth or password recovery. Remove their active routes and controls; email delivery is not part of this spec. |
| Existing identities | Preserve the two existing Supabase User UUIDs and emails. Set new Better Auth passwords through an interactive cutover command; do not migrate Supabase password hashes. |
| Financial preservation | Treat the migration as lossless. Do not normalize, deduplicate, regenerate, reclassify, round, or reinterpret any financial row during export or import. |
| Sessions | Store opaque sessions in PostgreSQL and send only secure, host-only, `HttpOnly`, `SameSite=Lax` cookies. Use a one-year sliding lifetime, refresh at most daily, and do not enable cookie session caching. |
| Abuse controls | Use Better Auth's database-backed rate limits for public auth endpoints. Do not add CAPTCHA unless observed abuse justifies it later. |
| Application data access | Use `pg` pools and Kysely repositories. Keep raw SQL as the schema authority and retain PostgreSQL functions where they protect atomic financial operations. |
| Migration runner | Use Dbmate through a one-shot deployment job. The API never applies migrations during startup. |
| Authorization | Enforce User ownership with RLS using a transaction-local authenticated User UUID. The runtime role cannot bypass RLS. |
| Cutover | Use a maintenance window of up to one hour. Stop writes, migrate once, validate, deploy, and reopen writes. Do not dual-write or reverse-sync. |
| Rollback boundary | Before writes reopen, abort and keep Supabase active if validation fails. After writes reopen, fix forward or restore local PostgreSQL; never return production writes to Supabase. |
| Recovery | Create encrypted rotating database recovery archives: 24 hourly, 14 daily, and 8 weekly. The User manually downloads archives to the main machine over SSH. |
| Supabase retirement | After successful local validation, remove all Supabase credentials and dependencies and decommission the hosted project. No Supabase reference system remains. |

## Target architecture

```text
Browser
  │ HTTPS; secure session cookie
  ▼
Cloudflare Tunnel → nginx → Hono API
                              ├─ Better Auth pool (`wallet_auth`) → `auth` schema
                              └─ request transaction (`wallet_app`) → financial tables + RLS

One-shot Dbmate job (`wallet_migrator`) → all schemas
Scheduled recovery job               → encrypted `pg_dump` archives
```

Supabase is absent from the target architecture.

## PostgreSQL ownership and roles

Use separate PostgreSQL roles and connection pools:

- `wallet_migrator` owns schema changes and runs only in the one-shot migration job.
- `wallet_auth` has the DML privileges Better Auth needs in the `auth` schema and no access to
  User financial rows.
- `wallet_app` has restricted DML privileges on application tables, cannot bypass RLS, and has no
  DDL privileges or direct access to authentication secrets.

Configure the Better Auth pool with `search_path=auth`; Better Auth officially supports a
[non-default PostgreSQL schema](https://better-auth.com/docs/adapters/postgresql#use-a-non-default-schema).
The API pool uses an explicit application schema search path and must never connect as the
migration or container superuser.

## Schema and migrations

1. Create `db/migrations/` as the only active migration chain and configure Dbmate to maintain its
   migration ledger.
2. Generate a schema-only dump of the live `public` schema because the existing repository lacks
   the original table definitions.
3. Review the dump into one clean target baseline. Preserve every table, constraint, index,
   sequence, function, trigger, and System category seed needed by current behavior.
4. Remove Supabase-specific owners, grants, roles, JWT helpers, PostgREST exposure, and references
   to `auth.users`.
5. Generate Better Auth's PostgreSQL schema during development, review the SQL, and commit it as a
   Dbmate migration in the `auth` schema. Better Auth CLI commands must not mutate production.
6. Reference the Better Auth User UUID from User-owned financial rows and keep nullable ownership
   for shared System categories where current behavior requires it.
7. Port all nine existing RPC behaviors to ordinary PostgreSQL functions without changing their
   atomic business behavior: `reorder_accounts`, `create_transfer_with_fee`, `log_subscription`,
   `create_disbursed_loan`, `create_opening_loan`, `create_loan_repayment`,
   `update_loan_repayment`, `update_loan_disbursement`, and `close_loan`.
8. Prove that an empty PostgreSQL 17 database can reach the complete current schema using only
   Dbmate migrations.
9. Remove the active `supabase/` tree and Supabase CLI dependency after the reviewed baseline
   replaces them. Git history remains the only legacy migration archive.

Dbmate migrations remain raw SQL and transactional where PostgreSQL permits it. A migration that
cannot run transactionally must state why and define its recovery procedure.

## Financial preservation invariant

The target database must represent the frozen source exactly. The migration changes storage and
authentication infrastructure, not financial facts or application behavior.

- Preserve every primary key, User UUID, foreign key, nullable value, ordering value, active or
  archived state, and source timestamp unless a target-only technical column has no source
  equivalent.
- Compare every Transaction column by primary key, including owner, Account, Category, type,
  amount, Local date, Local time, merchant, note, transfer relationships, transfer fees,
  Subscription links, Personal-loan links, and Unexplained-adjustment data.
- Preserve Account opening balances and display order; Category hierarchy and Favorites; Budget
  scope; Subscription state; loan People, Personal loans, and loan events; and System category
  identities and translations.
- Do not regenerate financial UUIDs, convert Local dates or Local times through a timezone,
  recalculate stored inputs from derived values, or run cleanup transformations during import.
- Generate a deterministic source manifest while writes are stopped: row count and canonical
  content digest per table, plus a per-Transaction digest keyed by Transaction ID. Generate the
  same manifest on the target and require an exact match before production writes reopen.
- Permit differences only in replaced authentication records, session/token material, migration
  metadata, and PostgreSQL physical metadata. List any additional difference explicitly and stop
  cutover for approval instead of accepting it silently.

## Application data layer

- Replace the API Supabase client with two explicitly configured `pg` pools: Better Auth and
  application data.
- Define strict Kysely database interfaces from the reviewed schema; do not carry generated
  PostgREST types forward.
- Make repositories accept a transaction-scoped Kysely executor instead of constructing global
  privileged clients.
- Preserve controller, service, API response, validation, and financial behavior unless the auth
  transport requires a change.
- Keep multi-row financial operations atomic. Existing transfer, subscription logging, Account
  reordering, and Personal loan operations must still commit or roll back as one unit.
- Replace bearer-token injection in the web API client with `credentials: "same-origin"`; keep the
  existing client-timezone header and response/error contracts.

## Authentication migration

### Runtime behavior

- Mount Better Auth under the same-origin API namespace and integrate its React client behind the
  existing app-owned auth context.
- Preserve public email/password signup, sign-in, sign-out, protected-route redirects, and
  authenticated redirects away from auth pages.
- Keep signup limited to email and password. Derive Better Auth's required internal name from the
  normalized email instead of adding a profile field to this migration.
- Configure UUID IDs for new Better Auth records.
- Resolve the session server-side for every protected request. Put the authenticated User UUID in
  Hono context; never accept a User ID from a request body, query, or browser-readable token.
- Validate proxy origin and client-IP headers against the known nginx/Cloudflare path. Do not
  trust arbitrary forwarded headers from direct clients.
- Remove Google sign-in, forgot-password, and reset-password controls and routes. Their return is
  a separate product spec, not part of the database migration.

### Existing Users

1. Export only the existing User ID, normalized email, safe display metadata, and timestamps from
   Supabase Auth for identity conversion.
2. Insert the Better Auth User rows with the same UUIDs before importing financial rows.
3. Run a cutover-only command in an interactive terminal to set each existing User's new password.
   Read passwords from a hidden prompt; never accept them in command arguments, environment
   variables, logs, or migration SQL.
4. Create credential-account rows through Better Auth-compatible password hashing rather than
   writing undocumented hashes.
5. Do not migrate Supabase sessions, refresh tokens, OAuth tokens, or password hashes. Every User
   signs in again after cutover.

## RLS and request transactions

Every authenticated application-data request runs inside one database transaction:

1. Resolve the Better Auth session.
2. Acquire a `wallet_app` transaction.
3. Set the User UUID with transaction-local `set_config`; never use a session-level setting on a
   pooled connection.
4. Execute all repository work through that transaction.
5. Commit on success or roll back on any error, clearing the identity context automatically.

RLS policies must fail closed when the setting is absent or malformed. User-owned rows permit only
the matching owner. Shared System categories and their translations remain readable by every
authenticated User, but only migration-owned processes may mutate them. Add tests that omit the
repository owner predicate intentionally and prove RLS still prevents cross-User access.

## Production deployment

Extend the local Compose definition in this repository and, through the coordinated
`/Users/thomasduong/dev/personal/deploy/docs/specs/wallet-supabase-exit/` spec, the production
Compose definition in the private deployment repository with:

- A health-checked PostgreSQL 17 service on the private Wallet network and a dedicated named
  volume.
- A one-shot migration service using `wallet_migrator`; API replacement waits for successful
  migration completion.
- A scheduled recovery job with only the privileges needed for `pg_dump` and archive rotation.
- Separate secrets for the container administrator, migrator, auth runtime, application runtime,
  Better Auth signing secrets, and `age` recipient. Do not bake secrets into images or the web
  bundle.
- A database-aware readiness endpoint distinct from process liveness so deployment cannot report
  healthy while PostgreSQL or required migrations are unavailable.

Pin Better Auth, Kysely, `pg`, and Dbmate in the lockfile. Review Better Auth schema changes into
Dbmate before dependency upgrades. Update CI to run integration tests against ephemeral
PostgreSQL 17 and update deployment documentation to describe the new source of truth and recovery
procedure.

## Database recovery archives

- Produce a PostgreSQL custom-format archive with a single consistent snapshot of the `auth` and
  application schemas.
- Write to a temporary filename, validate the archive, encrypt it to the main machine's `age`
  public key, compute a checksum, and only then atomically publish it. Never retain a plaintext
  archive after successful encryption.
- Create a new timestamped archive before pruning expired archives; never overwrite the current
  recovery point in place.
- Retain 24 hourly, 14 daily, and 8 weekly archives on the home server.
- Verify every archive structurally and perform a complete restore rehearsal before cutover and
  after material schema changes.
- Keep the `age` private key only on the main machine. Restoration requires that key.
- Leave off-host transfer manual, as confirmed. Same-disk archives provide an approximately
  one-hour recovery point while the home-server disk survives. Recovery after total disk loss is
  limited to the most recent archive manually downloaded to the main machine; the plan makes no
  stronger off-host recovery-point claim.

This operational archive is distinct from the product's User-portable Backup defined in
`CONTEXT.md`.

## Cutover runbook

### Before maintenance

1. Build and test the complete target stack against an empty PostgreSQL 17 database.
2. Rehearse a recent production-data export into an isolated target and record table counts,
   ownership counts, exact content manifests, invariant checks, and financial aggregates.
3. Restore an encrypted target archive into a fresh database and repeat the checks.
4. Prepare the interactive password command for the two existing Users.
5. Stage the web, API, migration, PostgreSQL, and recovery configuration without changing
   production traffic.

### Maintenance window

1. Put the current app into maintenance mode and verify that no writes continue.
2. Create and download a final encrypted source recovery archive.
3. Export the final application data and the minimal identity conversion fields.
4. Start the dedicated target PostgreSQL service and run Dbmate to completion.
5. Insert the two preserved User identities and set their passwords interactively.
6. Import every application table in dependency-safe order.
7. Run automated source-versus-target validation. If any check fails—including any Transaction
   row or digest mismatch—keep writes closed, discard the target attempt, and return to the
   pre-cutover state.
8. Deploy the session-based API and web app, run production smoke tests with both Users, and only
   then reopen writes.

### After writes reopen

1. Treat local PostgreSQL as the only source of truth and create the first encrypted scheduled
   archive.
2. Remove Supabase environment variables, GitHub secrets, web build arguments, packages, code,
   documentation, and deployment configuration.
3. Decommission the hosted Supabase project. Because project deletion is irreversible, execution
   must obtain explicit confirmation immediately before that final destructive action.
4. Do not send any production reads or writes back to Supabase. Correct defects forward or restore
   the local database.

## Validation and acceptance

### Schema and migration

- Dbmate creates the complete schema from an empty PostgreSQL 17 database without Supabase tooling.
- A second migration run is a no-op.
- The target contains the expected constraints, indexes, functions, triggers, grants, and RLS
  policies and no Supabase roles or `auth.users` references.

### Data equivalence

- Every imported table matches source row counts globally and per User.
- Every financial table's canonical content digest matches the frozen source.
- Every Transaction matches the source column-for-column under the same Transaction ID; no
  Transaction is missing, duplicated, rewritten, or reassigned.
- The two User UUIDs match exactly, and every User-owned foreign key resolves to the preserved
  identity.
- There are no orphaned relationships or ownership mismatches.
- Per-User computed Account balances, Transaction totals by type, Budget and Subscription counts,
  Category/Favorite relationships, and Personal loan balances match the frozen source.
- All nine current atomic RPC behaviors produce equivalent results on the target.
- Existing financial API contracts and observable feature behavior remain unchanged after the
  repository replacement.

### Authentication and authorization

- A new User can sign up with email/password, signs in immediately, receives only a secure opaque
  cookie, refreshes the one-year sliding database session, and signs out successfully.
- Each migrated User signs in with the new cutover password and retains all prior financial data.
- Unauthenticated API requests return `401`.
- Cross-User reads and writes fail at both repository and RLS layers, including tests with missing
  owner predicates and missing transaction identity.
- Session revocation takes effect on the next request because no cookie session cache bypasses the
  database.
- Google OAuth and password-recovery routes and controls are absent rather than failing at runtime.

### Operations

- API readiness fails when PostgreSQL is unavailable or migrations are incomplete.
- A failed migration prevents API replacement.
- Archive creation never exposes a plaintext final file, rotation preserves the declared tiers,
  checksum validation passes, and a fresh PostgreSQL instance restores successfully.
- No application artifact, deployed secret, network request, package, or operational document
  requires Supabase after decommissioning.

## Expected repository impact

- API dependencies, environment parsing, database pools, auth middleware, Hono routes, and every
  feature repository under `packages/api/`.
- Web auth context/components, router, API client, translated auth copy, tests, and Supabase client
  removal under `packages/web/`.
- Shared database types under `packages/shared/`.
- New `db/` migrations, schema snapshot, recovery tooling, and cutover tooling.
- Root/package manifests, lockfile, Compose, Docker build inputs, example environment, GitHub
  workflows, and deployment documentation.
- Removal of active `supabase/` configuration and migrations after baseline conversion.
- A coordinated production Compose update in the private deployment repository.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| The repository cannot recreate the live schema | Generate and review the baseline from the frozen live schema, then prove clean bootstrap before cutover. |
| A User UUID changes and disconnects financial rows | Import identities first, preserve UUIDs exactly, enforce foreign keys, and compare ownership counts. |
| A pooled connection leaks one User's RLS context | Use transaction-local configuration only, force repository access through the transaction, and test connection reuse. |
| Better Auth upgrades mutate schema outside review | Pin dependencies and vendor generated SQL into Dbmate; never run auth migrations in API startup or production deploys. |
| Cookie auth trusts spoofed proxy headers | Restrict the network path, validate origins, configure trusted proxy headers explicitly, and test direct spoof attempts. |
| A cutover defect loses new writes | Keep writes closed through equivalence checks; after reopening, use local archives and fix forward rather than split sources of truth. |
| Same-disk archives are lost with the database disk | Encrypt archives for manual off-host download and state that disk-loss recovery reaches only the latest downloaded copy. |

## Explicitly out of scope

- Google OAuth.
- Forgot-password and reset-password flows.
- Transactional email or SMTP infrastructure.
- Email verification.
- CAPTCHA without observed abuse.
- Household sharing, invitations, admin UI, or any change to financial features.
- Supabase self-hosting or any post-cutover Supabase integration.
- Automated transfer of recovery archives to the main machine.
- Zero-downtime migration, dual writes, or reverse synchronization.
- Changing PostgreSQL major versions during the migration.

## Open items

None.

## Spec Delta

Capability: `identity-access`

### ADDED Requirement: Email and password access

#### Scenario: Visitor creates a User

**WHEN** a visitor submits a unique email and a valid password through public signup
**THEN** the app creates a User with a UUID, establishes a database-backed session, and grants
immediate access without requiring email verification

#### Scenario: Existing User signs in

**WHEN** a User submits the correct email and password
**THEN** the app establishes a database-backed session and returns the User to the intended
protected route

#### Scenario: User signs out

**WHEN** an authenticated User signs out
**THEN** the server revokes the session and the next protected request requires sign-in

#### Scenario: Unsupported auth flow is requested

**WHEN** a visitor opens the authentication surface
**THEN** the app offers email/password signup and sign-in without Google OAuth or password
recovery controls

### ADDED Requirement: Private financial data access

#### Scenario: User accesses owned financial data

**WHEN** an authenticated User reads or changes financial data
**THEN** the API and database permit access only to rows owned by that User, except shared System
categories that every authenticated User may read

#### Scenario: User attempts cross-User access

**WHEN** an authenticated User requests or submits an identifier owned by another User
**THEN** the operation reveals no private row and performs no mutation

#### Scenario: Request has no valid session

**WHEN** a protected API request has no valid server session
**THEN** the API returns `401` without querying User-owned financial data

### ADDED Requirement: Persistent revocable session

#### Scenario: Active session continues

**WHEN** a User returns with a valid session inside its one-year sliding lifetime
**THEN** the app keeps the User signed in and refreshes the server-side expiry no more than once per
day

#### Scenario: Session is revoked

**WHEN** the server revokes or expires a User's session
**THEN** the next request loses access even if the browser still holds the opaque session cookie

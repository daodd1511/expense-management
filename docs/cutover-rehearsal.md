# Cutover rehearsal

Use this runbook to prove source-to-target equivalence before requesting a production maintenance window. The commands fail closed: they do not accept unrecorded differences, and import refuses a target that already contains User data.

## Inputs

Prepare these values without committing them:

- `SOURCE_DATABASE_URL`: a read-only source connection that can select the allowed `auth.user` identity columns and every application table.
- `TARGET_DATABASE_URL`: an isolated, fully migrated PostgreSQL 17 target. Use the migrator role for import and a read-only connection for validation when practical.
- `AUTH_DATABASE_URL`: the isolated target's `wallet_auth` connection for interactive credential creation.
- A new artifact and report path for each rehearsal. The exporter refuses to overwrite an existing artifact.

The identity export contains only the preserved User UUID, normalized email, display name, image, email-verification flag, and creation/update timestamps. It excludes Supabase password hashes, sessions, refresh tokens, OAuth tokens, and authentication metadata not required by Better Auth.

## Rehearsal sequence

1. Freeze source writes or use a rehearsal snapshot that cannot change during export.
2. Export one repeatable-read snapshot:

   ```sh
   SOURCE_DATABASE_URL='<source connection>' pnpm cutover:export -- --output rehearsal-source.json
   ```

3. Run Dbmate against an empty target, then import identities before application rows:

   ```sh
   TARGET_DATABASE_URL='<target migrator connection>' pnpm cutover:import -- --input rehearsal-source.json
   ```

4. Set each preserved User's password in an interactive terminal. The command accepts the User UUID as an argument but reads the password twice from a hidden TTY; it never accepts a password through arguments or environment variables.

   ```sh
   AUTH_DATABASE_URL='<wallet_auth connection>' pnpm cutover:set-password -- --user-id '<preserved UUID>'
   ```

5. Produce the validation report:

   ```sh
   TARGET_DATABASE_URL='<target read connection>' pnpm cutover:validate -- \
     --source rehearsal-source.json \
     --output rehearsal-validation.json
   ```

6. Review the report and exercise all nine financial operations against the isolated target.

## Required equality

Validation requires all of these values to match exactly:

- Global and per-User row counts and canonical SHA-256 digests for every application table.
- A column-level digest for every Transaction UUID.
- Preserved User UUIDs and the allowed identity fields.
- Foreign-key and ownership relationships with no orphan or cross-User reference.
- Per-User Account balances, Transaction totals by type, Budget and Subscription totals, Category Favorites, and loan-event totals.

The artifact intentionally excludes replaced authentication records, session/token material, Dbmate metadata, and PostgreSQL physical metadata. No other difference is automatically allowed. If a new difference is intentional, stop and obtain approval before changing the manifest contract; never add a one-off ignore during a maintenance window.

## Maintenance-window rule

Keep writes closed until final export, import, password creation, exact validation, restore rehearsal, deployment, and both-User smoke tests have passed. If any command or check fails, do not reopen writes on the target. Discard the target attempt and return to the pre-cutover application state. Do not dual-write or send post-cutover traffic back to Supabase.

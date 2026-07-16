# Data Portability — Plan

Produced via `/grill-with-docs`. All product decisions below were explicitly confirmed. Depends on `spending-analytics` for the shared Report range model and on `account-reordering` so Backups preserve Account order.

## Goal

Give a User a human-readable CSV Data export and a versioned JSON Backup/Restore flow without storing files on the server.

## Domain and Architecture Decisions

- **One feature, distinct purposes**: CSV Data export is for spreadsheets and is never importable; JSON Backup is the round-trip recovery format.
- **Manual files only**: the browser downloads and uploads files; no cloud archive, scheduled backup, or server-side file retention.
- **Authenticated ownership**: export/backup reads only the current User's data; Restore assigns imported data only to the current User.
- **Account-portable**: a Backup contains no original authentication identity and may be restored into another authenticated User controlled by the file holder.
- **Deployment-portable**: shared System category references use immutable portable identities, never instance UUIDs or localized names (ADR 0007).
- **Versioned compatibility**: every Backup has a required format version; supported older versions migrate explicitly, while unknown newer versions are rejected before mutation.
- **Plaintext v1**: JSON is UTF-8 plaintext with a sensitive-data warning; encryption can be a later format version.
- **Replace-only Restore**: Restore never merges. It validates fully, then atomically replaces the current User's financial data.
- **Fresh destination IDs**: Restore generates new IDs and rewrites every internal relationship to avoid collisions.

## CSV Data Export

### Scope

- Lives in Reports and uses the selected shared Report range.
- Contains every income and expense Transaction included by `Income vs Expense` for that range, regardless of the active income/expense tab.
- Excludes Transfers, loan-linked Transactions, and Unexplained adjustments so CSV totals reconcile with the Report.

### Contract

- UTF-8 with BOM and RFC-compatible CSV escaping.
- Localized column headers and Transaction-type labels based on the current app language.
- Stable values: ISO date, 24-hour time, whole Đồng amount without grouping or currency symbol.
- Columns: date, time, type, amount, Account, Category, merchant, note.
- Use localized Account/Category display names; use an explicit localized Uncategorized label when needed.

### API and Web

1. Add an authenticated CSV endpoint accepting `from`, `to`, and supported `locale`, reusing Income vs Expense inclusion rules.
2. Return `text/csv`, a safe range-based filename, BOM, and `Content-Disposition: attachment`.
3. Add a Reports download action that uses the selected range and current locale, handles Blob responses, and reports errors without navigating away.

## JSON Backup Contract

### Included User-Owned Financial State

- Accounts, including archive state and persistent display order.
- Transactions and their internal links.
- Custom Categories and hierarchy.
- Category Favorites, whether they reference custom or System categories.
- Budgets.
- Subscriptions.
- loan People, Personal loans, and loan events.

### Excluded State

- Auth identity and User IDs.
- System category rows and translations; references use the immutable System-category identity.
- Computed balances, Reports, analytics, caches, and other derived values.
- Device-local theme/language preferences.
- Receipt/attachment binaries and deployment-specific URLs.

### Envelope

1. Include `formatVersion`, creation timestamp, source app version, and typed data sections.
2. Use Backup-local IDs only to express relationships within the file; never treat them as destination database IDs.
3. Validate with strict shared schemas and reject unknown or malformed required data for that format version.
4. Maintain ordered migrators from every supported older format into the current in-memory format.

## Backup and Restore API

1. Add an authenticated Backup endpoint that obtains one transactionally consistent snapshot of every included table and returns JSON as a download.
2. Add an authenticated validation endpoint that parses/migrates the uploaded JSON without mutation and returns format metadata, creation date, per-section counts, and blocking errors.
3. Add an authenticated Restore endpoint requiring the literal confirmation `RESTORE` and the same validated current-format payload.
4. Implement Restore in one database transaction: resolve System category identities, delete only the current User's existing financial state in dependency-safe order, generate fresh IDs, rewrite relationships, insert all sections, and commit only after integrity checks pass.
5. Roll back everything on any missing System category, ownership violation, invalid reference, constraint error, or count mismatch.
6. Add immutable portable keys for every System category, backfill existing rows, enforce uniqueness for System categories, and update seeds/migrations per ADR 0007.

## Restore UX

1. Place Backup and Restore in Settings → Data on desktop and mobile.
2. Warn that downloaded CSV/JSON files contain sensitive financial data.
3. Keep the selected file in browser memory only; do not upload until validation is requested and never retain it afterward.
4. After validation, show Backup version/date and record counts by section.
5. Present a prominent **Download current Backup first** action.
6. Require the User to type `RESTORE`; disable confirmation until it matches exactly.
7. After success, clear/invalidate all User-scoped queries and reload authoritative data.

## Verification

- CSV rows and totals reconcile exactly with Income vs Expense for the selected range in both supported locales.
- CSV escaping handles commas, quotes, newlines, Unicode, empty values, and spreadsheet-compatible BOM.
- Backup contains all and only the authenticated User's included data.
- Restoring into the same or a different User/deployment recreates equivalent financial state with fresh IDs and correct relationships.
- Existing destination data is fully replaced only after validation and explicit confirmation.
- Invalid/newer files and missing System category identities cause zero mutations.
- A forced error at every Restore stage rolls the whole transaction back.
- Restored Account ordering, balances, Reports, Subscriptions, Favorites, and Personal loans match the source state.

## Explicitly Out of Scope

- CSV import.
- Merge, selective, or partial Restore.
- Cloud/scheduled/server-retained Backups.
- Password encryption in v1.
- Auth-account migration or deletion.
- Attachment binary export/Restore.

## Open Items

None.

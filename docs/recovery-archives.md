# Database recovery archives

The recovery tools create encrypted PostgreSQL custom-format archives for the `auth`, `public`, and `wallet` schemas. They validate the plaintext archive before encryption, calculate the encrypted-file checksum before publication, publish with rename operations, and remove plaintext through an exit trap.

## Create an archive

Install `age`, PostgreSQL client tools, and `shasum` in the recovery image or host. Keep the `age` private key only on the main machine; configure the home server with its public recipient.

Set these runtime inputs without baking them into an image or web bundle:

- `DATABASE_URL`: the least-privilege recovery connection.
- `AGE_RECIPIENT`: the main machine's public `age` recipient.
- `ARCHIVE_DIR`: a specific archive directory, never `/`.

Run:

```sh
DATABASE_URL='<recovery connection>' \
AGE_RECIPIENT='<public recipient>' \
ARCHIVE_DIR='/specific/archive/directory' \
pnpm recovery:archive
```

The command creates the new hourly recovery point before pruning. It retains 24 hourly, 14 daily, and 8 Monday-based ISO-week archives, each with a `.sha256` sidecar. It never overwrites the current hourly recovery point in place.

## Restore rehearsal

Create a fresh empty PostgreSQL database. The restore command refuses any target that already contains a table in `auth` or `public`.

```sh
AGE_IDENTITY_FILE='/path/on/main-machine/identity.txt' \
RESTORE_DATABASE_URL='<fresh target connection>' \
pnpm recovery:restore-rehearsal -- '/path/to/wallet-TIMESTAMP.dump.age'
```

The command verifies the encrypted checksum, decrypts into a private temporary directory, validates the custom archive, replaces only the fresh database's empty default `public` schema, restores without source ownership while preserving the reviewed grants, and confirms the auth/application tables and all nine named functions exist. The cluster must already contain the reviewed Wallet roles. Set `CUTOVER_SOURCE_FILE` to a frozen cutover artifact when the rehearsal should also run exact data validation against the restored database.

Perform a complete restore rehearsal before cutover and after material schema changes. Retain the generated command output and validation report as review evidence.

## Recovery claim

These archives remain on the same home-server disk as an operational default and provide an approximately one-hour recovery point only while that disk survives. Off-host transfer is manual. Recovery after total disk loss reaches only the newest encrypted archive previously downloaded to the main machine. This design does not claim automated off-host durability or a stronger disk-loss recovery point.

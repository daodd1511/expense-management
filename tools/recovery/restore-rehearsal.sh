#!/bin/sh
set -eu

umask 077

fail() {
  echo "restore-rehearsal: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

[ "$#" -eq 1 ] || fail "usage: restore-rehearsal.sh <wallet.dump.age>"
: "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"

archive=$1
checksum="$archive.sha256"
[ -f "$archive" ] || fail "archive does not exist: $archive"
[ -f "$checksum" ] || fail "checksum does not exist: $checksum"
[ -f "$AGE_IDENTITY_FILE" ] || fail "age identity does not exist"

require_command age
require_command pg_restore
require_command psql
require_command shasum

expected=$(awk 'NR == 1 { print $1 }' "$checksum")
actual=$(shasum -a 256 "$archive" | awk '{print $1}')
[ -n "$expected" ] && [ "$expected" = "$actual" ] || fail "archive checksum mismatch"

existing=$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c "select count(*) from information_schema.tables where table_schema in ('auth', 'public')")
[ "$existing" = "0" ] || fail "restore target is not an empty database"
extra_schemas=$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c "select count(*) from pg_namespace where nspname in ('auth', 'wallet')")
[ "$extra_schemas" = "0" ] || fail "restore target already contains Wallet schemas"
psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "drop schema public" >/dev/null

temporary_dir=$(mktemp -d "${TMPDIR:-/tmp}/wallet-restore.XXXXXX")
plaintext="$temporary_dir/wallet.dump"
cleanup() {
  rm -f "$plaintext"
  rmdir "$temporary_dir" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

age --decrypt --identity "$AGE_IDENTITY_FILE" --output "$plaintext" "$archive"
pg_restore --list "$plaintext" >/dev/null
pg_restore --exit-on-error --no-owner --dbname="$RESTORE_DATABASE_URL" "$plaintext"

auth_table=$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c "select to_regclass('auth.\"user\"') is not null")
[ "$auth_table" = "t" ] || fail "restored archive is missing auth.user"
transactions_table=$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
  -c "select to_regclass('public.transactions') is not null")
[ "$transactions_table" = "t" ] || fail "restored archive is missing public.transactions"
function_count=$(psql "$RESTORE_DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "
  select count(distinct p.proname)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'reorder_accounts',
      'create_transfer_with_fee',
      'log_subscription',
      'create_disbursed_loan',
      'create_opening_loan',
      'create_loan_repayment',
      'update_loan_repayment',
      'update_loan_disbursement',
      'close_loan'
    )")
[ "$function_count" = "9" ] || fail "restored archive does not contain all nine Wallet functions"

if [ -n "${CUTOVER_SOURCE_FILE:-}" ]; then
  TARGET_DATABASE_URL="$RESTORE_DATABASE_URL" pnpm cutover:validate -- --source "$CUTOVER_SOURCE_FILE"
fi

echo "Restore rehearsal passed"

#!/bin/sh
set -eu

umask 077

fail() {
  echo "archive: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AGE_RECIPIENT:?AGE_RECIPIENT is required}"
: "${ARCHIVE_DIR:?ARCHIVE_DIR is required}"

case "$ARCHIVE_DIR" in
  /|"") fail "ARCHIVE_DIR must be a specific directory" ;;
esac

require_command pg_dump
require_command pg_restore
require_command age
require_command shasum

calculate_digest() {
  if ! checksum_output=$(shasum -a 256 "$1"); then
    return 1
  fi
  checksum_digest=${checksum_output%% *}
  [ "${#checksum_digest}" -eq 64 ] || return 1
  case "$checksum_digest" in
    *[!0-9a-f]*) return 1 ;;
  esac
  printf '%s\n' "$checksum_digest"
}

timestamp=${WALLET_ARCHIVE_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}
case "$timestamp" in
  [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z) ;;
  *) fail "WALLET_ARCHIVE_TIMESTAMP must use YYYYMMDDTHHMMSSZ" ;;
esac

mkdir -p "$ARCHIVE_DIR/hourly" "$ARCHIVE_DIR/daily" "$ARCHIVE_DIR/weekly"
temporary_dir=$(mktemp -d "$ARCHIVE_DIR/.wallet-archive.XXXXXX")
plaintext="$temporary_dir/wallet.dump"
encrypted="$temporary_dir/wallet-${timestamp}.dump.age"
published="$ARCHIVE_DIR/hourly/wallet-${timestamp}.dump.age"
[ ! -e "$published" ] && [ ! -e "$published.sha256" ] \
  || fail "archive timestamp already exists: $timestamp"

cleanup() {
  rm -f "$plaintext" "$encrypted" "$temporary_dir/checksum"
  rmdir "$temporary_dir" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

pg_dump \
  --format=custom \
  --no-owner \
  --schema=auth \
  --schema=public \
  --schema=wallet \
  --file="$plaintext" \
  "$DATABASE_URL"

pg_restore --list "$plaintext" >/dev/null
age --encrypt --recipient "$AGE_RECIPIENT" --output "$encrypted" "$plaintext"
if ! digest=$(calculate_digest "$encrypted"); then
  fail "failed to calculate encrypted archive checksum"
fi
printf '%s  %s\n' "$digest" "$(basename "$published")" > "$temporary_dir/checksum"

mv "$temporary_dir/checksum" "$published.sha256"
if ! mv "$encrypted" "$published"; then
  rm -f "$published.sha256"
  fail "failed to publish encrypted archive"
fi
rm -f "$plaintext"

copy_tier() {
  tier=$1
  filename=$2
  destination="$ARCHIVE_DIR/$tier/$filename"
  cp "$published" "$destination.tmp"
  if ! digest=$(calculate_digest "$destination.tmp"); then
    rm -f "$destination.tmp" "$destination.sha256.tmp"
    fail "failed to calculate $tier archive checksum"
  fi
  printf '%s  %s\n' "$digest" "$(basename "$destination")" > "$destination.sha256.tmp"
  mv "$destination.sha256.tmp" "$destination.sha256"
  mv "$destination.tmp" "$destination"
}

day=${timestamp%%T*}
daily_name="wallet-${day}.dump.age"
if [ ! -e "$ARCHIVE_DIR/daily/$daily_name" ]; then
  copy_tier daily "$daily_name"
fi

weekday=$(date -u -j -f %Y%m%d "$day" +%u 2>/dev/null || date -u -d "$day" +%u)
week=$(date -u -j -f %Y%m%d "$day" +%G-W%V 2>/dev/null || date -u -d "$day" +%G-W%V)
weekly_name="wallet-${week}.dump.age"
if [ "$weekday" = "1" ] && [ ! -e "$ARCHIVE_DIR/weekly/$weekly_name" ]; then
  copy_tier weekly "$weekly_name"
fi

prune_tier() {
  tier=$1
  keep=$2
  find "$ARCHIVE_DIR/$tier" -type f -name 'wallet-*.dump.age' -print \
    | sort -r \
    | awk -v keep="$keep" 'NR > keep' \
    | while IFS= read -r expired; do
        rm -f "$expired" "$expired.sha256"
      done
}

prune_tier hourly 24
prune_tier daily 14
prune_tier weekly 8

echo "$published"

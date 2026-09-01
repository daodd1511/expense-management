#!/bin/sh
set -eu

command_name="${1:-help}"
if [ "$#" -gt 0 ]; then
  shift
fi

case "$command_name" in
  bootstrap)
    exec /usr/local/bin/wallet-bootstrap "$@"
    ;;
  migrate)
    : "${DATABASE_URL:?DATABASE_URL is required}"
    exec /usr/local/bin/dbmate \
      --no-dump-schema \
      --migrations-dir /opt/wallet/db/migrations \
      up "$@"
    ;;
  migrate-status)
    : "${DATABASE_URL:?DATABASE_URL is required}"
    exec /usr/local/bin/dbmate \
      --no-dump-schema \
      --migrations-dir /opt/wallet/db/migrations \
      status "$@"
    ;;
  archive)
    exec /usr/local/bin/wallet-archive "$@"
    ;;
  restore-rehearsal)
    exec /usr/local/bin/wallet-restore-rehearsal "$@"
    ;;
  cutover-export)
    exec node /opt/wallet/cutover/export.js "$@"
    ;;
  cutover-import)
    exec node /opt/wallet/cutover/import.js "$@"
    ;;
  cutover-validate)
    exec node /opt/wallet/cutover/validate.js "$@"
    ;;
  cutover-set-password)
    exec node /opt/wallet/cutover/set-password.js "$@"
    ;;
  help)
    printf '%s\n' \
      'wallet-ops commands:' \
      '  bootstrap             create restricted cluster roles and assign credentials' \
      '  migrate               apply the bundled Dbmate migration chain' \
      '  migrate-status        report bundled Dbmate migration status' \
      '  archive               create and rotate an encrypted recovery archive' \
      '  restore-rehearsal     restore an encrypted archive into a fresh database' \
      '  cutover-export        export a frozen Supabase cutover artifact' \
      '  cutover-import        import a frozen artifact into PostgreSQL' \
      '  cutover-validate      compare a target with a frozen artifact' \
      '  cutover-set-password  set a preserved User password from an interactive TTY'
    ;;
  *)
    printf 'Unknown wallet-ops command: %s\n' "$command_name" >&2
    exit 64
    ;;
esac

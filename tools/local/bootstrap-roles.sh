#!/bin/sh
set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${WALLET_APP_PASSWORD:?WALLET_APP_PASSWORD is required}"
: "${WALLET_AUTH_PASSWORD:?WALLET_AUTH_PASSWORD is required}"
: "${WALLET_RECOVERY_PASSWORD:?WALLET_RECOVERY_PASSWORD is required}"

psql -X -v ON_ERROR_STOP=1 <<'SQL'
\set wallet_app_password `printf '%s' "$WALLET_APP_PASSWORD"`
\set wallet_auth_password `printf '%s' "$WALLET_AUTH_PASSWORD"`
\set wallet_recovery_password `printf '%s' "$WALLET_RECOVERY_PASSWORD"`
ALTER ROLE wallet_app PASSWORD :'wallet_app_password';
ALTER ROLE wallet_auth PASSWORD :'wallet_auth_password';
ALTER ROLE wallet_recovery PASSWORD :'wallet_recovery_password';
SQL

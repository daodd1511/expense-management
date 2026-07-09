#!/usr/bin/env bash
# VPS-side deploy: versioned releases + atomic symlink flip with automatic rollback.
#
# Invoked by .github/workflows/deploy.yml after the tarball is extracted:
#   bash /tmp/wallet-deploy/deploy.sh <sha> [staging-dir]
#
# Layout it maintains on the VPS:
#   /var/www/wallet/releases/<sha>/{api,web}   versioned releases (last 3 kept)
#   /var/www/wallet/shared/.env                server-side env, never touched by deploys
#   /var/www/wallet/current -> releases/<sha>  atomic flip
# Legacy vhost paths become symlinks into the release tree on first run
# (nginx follows them, so no nginx config change is needed).
set -euo pipefail

SHA="${1:?usage: deploy.sh <sha> [staging-dir]}"
STAGING="${2:-/tmp/wallet-deploy}"

BASE=/var/www/wallet
WEB_LINK=/var/www/wallet.thomasduong.info.vn
API_LINK=/var/www/api.wallet.thomasduong.info.vn
RELEASE="$BASE/releases/$SHA"
KEEP=3
export PORT=3000

mkdir -p "$BASE/releases" "$BASE/shared"

# One-time migration: adopt the legacy .env before the legacy dir is replaced.
if [ ! -f "$BASE/shared/.env" ] && [ ! -L "$API_LINK" ] && [ -f "$API_LINK/.env" ]; then
  cp "$API_LINK/.env" "$BASE/shared/.env"
fi
if [ ! -f "$BASE/shared/.env" ]; then
  echo "missing $BASE/shared/.env — create it before deploying" >&2
  exit 1
fi

# Stage the new release; the live release is never touched.
rm -rf "$RELEASE"
mkdir -p "$RELEASE"
cp -R "$STAGING/api" "$RELEASE/api"
cp -R "$STAGING/web" "$RELEASE/web"
# dotenv/config resolves .env from the process cwd (the release's api dir)
ln -sfn "$BASE/shared/.env" "$RELEASE/api/.env"

PREV="$(readlink "$BASE/current" 2>/dev/null || true)"

start_api() {
  cd "$1"
  pm2 delete api-wallet >/dev/null 2>&1 || true
  pm2 start index.js --name api-wallet --interpreter node
  pm2 save
}

healthy() {
  for _ in $(seq 1 15); do
    if curl -fs "http://127.0.0.1:$PORT/health" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Flip, then point the legacy vhost paths through the release tree (one-time:
# a real directory at either path is replaced by a symlink).
ln -sfn "$RELEASE" "$BASE/current"
if [ -e "$WEB_LINK" ] && [ ! -L "$WEB_LINK" ]; then rm -rf "$WEB_LINK"; fi
ln -sfn "$BASE/current/web" "$WEB_LINK"
if [ -e "$API_LINK" ] && [ ! -L "$API_LINK" ]; then rm -rf "$API_LINK"; fi
ln -sfn "$BASE/current/api" "$API_LINK"

start_api "$BASE/current/api"

if ! healthy; then
  echo "health check failed for $SHA" >&2
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    echo "rolling back to $(basename "$PREV")" >&2
    ln -sfn "$PREV" "$BASE/current"
    start_api "$PREV/api"
    healthy || echo "rollback health check ALSO failed — manual intervention needed" >&2
  else
    echo "no previous release to roll back to" >&2
  fi
  exit 1
fi

# Prune old releases (never the one `current` points at).
CURRENT_TARGET="$(readlink "$BASE/current")"
cd "$BASE/releases"
ls -1t | tail -n +"$((KEEP + 1))" | while read -r dir; do
  if [ "$BASE/releases/$dir" != "$CURRENT_TARGET" ]; then
    rm -rf "$BASE/releases/${dir:?}"
  fi
done

rm -rf "$STAGING" /tmp/deploy.tar.gz
echo "deploy ok: $SHA"

# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS cutover-build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --filter @wallet/api...

COPY packages/shared packages/shared
COPY packages/api packages/api
COPY tools/cutover tools/cutover
RUN mkdir -p /out \
    && pnpm --filter @wallet/api exec esbuild \
      /repo/tools/cutover/export.ts \
      /repo/tools/cutover/import.ts \
      /repo/tools/cutover/validate.ts \
      /repo/tools/cutover/set-password.ts \
      --bundle \
      --platform=node \
      --target=node22 \
      --format=esm \
      --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
      --outdir=/out

FROM node:22-bookworm-slim AS node-runtime
FROM ghcr.io/amacneil/dbmate:2.35.0 AS dbmate

FROM postgres:17-bookworm
LABEL org.opencontainers.image.source="https://github.com/daodd1511/expense-management"

RUN apt-get update \
    && apt-get install -y --no-install-recommends age libdigest-sha-perl \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o postgres -g postgres /work /archives

COPY --from=node-runtime /usr/local/ /usr/local/
COPY --from=dbmate /usr/local/bin/dbmate /usr/local/bin/dbmate
COPY --from=cutover-build /out/ /opt/wallet/cutover/
COPY db/migrations/ /opt/wallet/db/migrations/
COPY --chmod=0555 tools/ops/bootstrap-roles.sh /usr/local/bin/wallet-bootstrap
COPY --chmod=0555 tools/ops/entrypoint.sh /usr/local/bin/wallet-ops
COPY --chmod=0555 tools/recovery/archive.sh /usr/local/bin/wallet-archive
COPY --chmod=0555 tools/recovery/restore-rehearsal.sh /usr/local/bin/wallet-restore-rehearsal

WORKDIR /work
USER postgres
ENTRYPOINT ["/usr/local/bin/wallet-ops"]
CMD ["help"]

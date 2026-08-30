# syntax=docker/dockerfile:1

# ---- build: compile the esbuild bundle in a full (glibc) node image ----
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo

# Warm the dependency layer: only manifests + lockfile invalidate it, not code changes.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --filter @wallet/api...

# Source. @wallet/shared is consumed as TS source (its "." export is ./src/index.ts).
COPY packages/shared packages/shared
COPY packages/api packages/api
RUN pnpm --filter @wallet/api build          # esbuild → packages/api/dist/index.js (self-contained)

# ---- runtime: node + the single bundled file, no node_modules or credentials ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /repo/packages/api/dist/index.js ./index.js
USER node
EXPOSE 3000
# Readiness includes PostgreSQL connectivity and the complete Dbmate chain.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/ready >/dev/null 2>&1 || exit 1
CMD ["node", "index.js"]

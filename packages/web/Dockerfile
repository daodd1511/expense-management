# syntax=docker/dockerfile:1

# ---- build: vite build (glibc image avoids musl native-module issues) ----
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo

# Only the same-origin API path and public build metadata enter the browser bundle.
ARG VITE_API_BASE=/api
# Optional build metadata; falls back to "dev" in vite.config.ts when unset.
ARG APP_COMMIT=""
ARG APP_COMMIT_DATE=""
ENV VITE_API_BASE=$VITE_API_BASE \
    APP_COMMIT=$APP_COMMIT \
    APP_COMMIT_DATE=$APP_COMMIT_DATE

# Warm the dependency layer.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile --filter @wallet/web...

COPY packages/shared packages/shared
COPY packages/web packages/web
RUN pnpm --filter @wallet/web build          # tsc -b && vite build → packages/web/dist

# ---- runtime: static files served by nginx ----
FROM nginx:alpine
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/packages/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

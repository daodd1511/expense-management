# syntax=docker/dockerfile:1

# ---- build: vite build (glibc image avoids musl native-module issues) ----
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo

# VITE_* are compiled into the bundle at build time. The publishable key is public by design.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_BASE=/api
# Optional build metadata; falls back to "dev" in vite.config.ts when unset.
ARG APP_COMMIT=""
ARG APP_COMMIT_DATE=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_API_BASE=$VITE_API_BASE \
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

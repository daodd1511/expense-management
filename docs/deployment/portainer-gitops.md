# Self-Host Migration — Portainer GitOps (draft for review)

Moving the app off the paid VPS onto a home-lab laptop, using the tooling already
installed there (Docker, Portainer, cloudflared, Tailscale, uptime-kuma). **Draft — nothing
here is wired up yet.** Review, then I'll create the real files.

## Goals & constraints

- **$0 recurring cost.** No paid registry, no paid runner, no paid tunnel.
- **No image registry, no GitHub-hosted deploy runner.** Images build *on the laptop*; Portainer
  redeploys from the Git repo (GitOps).
- **Supabase stays in Supabase Cloud** — only the web + API move.
- **No open inbound ports.** Cloudflare Tunnel fronts everything; TLS terminates at Cloudflare's edge.

## Target architecture

```
Internet ──HTTPS──► Cloudflare edge (TLS) ──tunnel──► cloudflared (container)
                                                          │  routes wallet.thomasduong.info.vn
                                                          ▼        → web:80
                              ┌──────────── laptop / Docker ────────────┐
                              │  web  (nginx:alpine)                    │
                              │    ├─ serves static SPA (try_files)     │
                              │    ├─ /api/  → proxy → api:3000          │
                              │    └─ /health → proxy → api:3000         │
                              │  api  (node:22-alpine, bundled index.js)│
                              │       └──► Supabase Cloud (unchanged)   │
                              │  cloudflared, portainer, uptime-kuma,   │
                              │  tailscale  (already running)           │
                              └──────────────────────────────────────────┘
```

**Single public hostname.** Because the SPA calls the API same-origin (`VITE_API_BASE=/api`)
and Hono serves `/api/*`, nginx proxies `/api/` to the api container. The old
`api.wallet.thomasduong.info.vn` subdomain is **no longer needed** and can be retired after cutover.

## Deploy flow (push to `main`)

```
git push origin main
   │
   ├─ GitHub Actions CI (free)   → typecheck + test only. This is the quality gate.
   │        │ on success (main only)
   │        ▼
   │   curl Portainer stack webhook  ── outbound HTTPS ──►  Portainer (via its cloudflared hostname)
   │                                                            │
   ▼                                                            ▼  on the laptop, Portainer:
 (bad code fails CI, never triggers deploy)              git pull the repo
                                                         docker compose up -d --build
                                                           → builds web + api images locally
                                                           → recreates changed containers
                                                         → live behind cloudflared
```

- **Build happens on the laptop**, inside Docker, from the repo — no registry, nothing to transport.
- **CI is only the test gate.** A failing `typecheck`/`test` fails the workflow and the webhook is
  never called, so broken code can't deploy.
- **Zero-inbound alternative:** instead of the CI→webhook trigger, configure Portainer GitOps
  **polling** on branch `main` (e.g. every 5 min). Then nothing ever connects *in* — the laptop pulls
  itself. Trade-off: no test gate ordering (Portainer redeploys whatever `main` is), and up to one
  poll-interval of latency. Recommended path is the CI→webhook trigger; polling is the fallback if you
  want literally no inbound.

## Files to be created

| Path | Purpose |
|---|---|
| `packages/api/Dockerfile` | Multi-stage build of the API → `node:22-alpine` runtime with just the bundle |
| `packages/web/Dockerfile` | Multi-stage build of the SPA → `nginx:alpine` serving static + `/api` proxy |
| `packages/web/nginx.conf` | SPA fallback + reverse-proxy `/api/` and `/health` to `api:3000` |
| `docker-compose.yml` (repo root) | The Portainer stack: `api`, `web`, `cloudflared` |
| `.github/workflows/ci.yml` | Replaces `deploy.yml`; runs typecheck + test only |
| `.dockerignore` (repo root) | Keep `node_modules`, `dist`, `.git` out of the build context |

---

### `packages/api/Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1
# Build the esbuild bundle in a full node image, then ship only index.js.
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo
# Install deps for @wallet/api and its workspace deps (shared) with a warm cache layer.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --filter @wallet/api...
COPY packages/shared packages/shared
COPY packages/api packages/api
RUN pnpm --filter @wallet/api build          # → packages/api/dist/index.js (self-contained)

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /repo/packages/api/dist/index.js ./index.js
EXPOSE 3000
# busybox wget ships in alpine; /health is served at the root by Hono.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "index.js"]
```

Notes:
- The runtime image has **no `node_modules`** — esbuild bundles everything into `index.js`.
- Secrets are **not** baked in; `SUPABASE_URL` / `SUPABASE_SECRET_KEY` are injected at runtime
  (see compose / Portainer env below).

### `packages/web/Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /repo
# VITE_* are compiled into the bundle at build time. The publishable key is public by design.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_BASE=/api
ARG APP_COMMIT=""
ARG APP_COMMIT_DATE=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_API_BASE=$VITE_API_BASE \
    APP_COMMIT=$APP_COMMIT \
    APP_COMMIT_DATE=$APP_COMMIT_DATE
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile --filter @wallet/web...
COPY packages/shared packages/shared
COPY packages/web packages/web
RUN pnpm --filter @wallet/web build          # → packages/web/dist

FROM nginx:alpine
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/packages/web/dist /usr/share/nginx/html
EXPOSE 80
```

### `packages/web/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # API is same-origin; forward the full /api/... path unchanged (Hono uses basePath /api).
    location /api/ {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # External health visibility (uptime-kuma can hit https://wallet.…/health).
    location = /health {
        proxy_pass http://api:3000/health;
    }

    # SPA client-side fallback.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> DNS caveat: nginx resolves the `api` upstream once at startup. If the api container is recreated
> with a new IP, nginx keeps the stale one until reloaded. `docker compose up -d` recreates both
> together so this is usually a non-issue; if it ever bites, we add a `resolver 127.0.0.11;` + variable
> upstream. Left simple for now.

### `docker-compose.yml` (repo root — the Portainer stack)

```yaml
services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    image: wallet-api:local
    environment:
      NODE_ENV: production
      PORT: "3000"
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY}
    restart: unless-stopped
    networks: [wallet]

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
        VITE_API_BASE: /api
    image: wallet-web:local
    depends_on: [api]
    restart: unless-stopped
    networks: [wallet]

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN}
    restart: unless-stopped
    networks: [wallet]

networks:
  wallet:
    driver: bridge
```

**Secrets/config** (`${...}`) are supplied as **Portainer stack environment variables** in the UI —
they are *not* committed to the repo. Set: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `TUNNEL_TOKEN`. Copy the two `SUPABASE_*`
values from the VPS's `/var/www/wallet/shared/.env`.

### `.github/workflows/ci.yml` (replaces `deploy.yml`)

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.12.4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test

  # Only after the gate passes, on main, tell Portainer to redeploy.
  # Remove this job if you use Portainer polling instead.
  deploy:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Portainer redeploy
        run: curl -fsS -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

### `.dockerignore` (repo root)

```
node_modules
**/node_modules
**/dist
.git
.github
docs
supabase
presentation
*.tsbuildinfo
.pnpm-store
```

---

## One-time setup on the laptop

1. **Cloudflare Tunnel (token mode).** In the Cloudflare Zero Trust dashboard, create a tunnel, copy
   its **token** → set as the `TUNNEL_TOKEN` Portainer env var. Add a public hostname:
   `wallet.thomasduong.info.vn` → service `http://web:80`. (cloudflared shares the `wallet` Docker
   network, so it reaches `web` by name.)

   > **Use a DEDICATED tunnel for this stack — do not reuse an existing tunnel's token.** This compose
   > runs its own `cloudflared` connector. If you paste in the token of a tunnel that already has a
   > connector elsewhere on the box (e.g. one serving `home.thomasduong.info.vn → http://192.168.1.230:80`),
   > you get **two connectors on one tunnel**: Cloudflare round-robins requests between them, and only
   > this stack's connector can resolve `web:80`, so a chunk of requests 502. A dedicated tunnel also
   > keeps the service target as the in-network name `http://web:80` — never a host LAN IP:port, since
   > this stack publishes no host ports. Leave your other tunnels/hostnames untouched.
2. **Portainer stack from Git.** Portainer → Stacks → Add stack → **Git repository**. Point at this
   repo, branch `main`, compose path `docker-compose.yml`. Enable the **webhook** (copy its URL →
   GitHub secret `PORTAINER_WEBHOOK_URL`) *or* enable **automatic updates / polling** for zero-inbound.
   Add the five environment variables listed above.
3. **GitHub.** Add repo secret `PORTAINER_WEBHOOK_URL`. Delete the old `deploy.yml` and its `VPS_*`
   secrets. Add `ci.yml`.
4. **uptime-kuma.** Add an HTTP monitor for `https://wallet.thomasduong.info.vn/health` (expects
   `{"ok":true}`), alerting to your channel of choice.

## Cutover

1. Deploy the stack once manually in Portainer; verify on the laptop that both containers are healthy
   (`docker ps` shows api `healthy`, `curl localhost` via the web container).
2. Point the Cloudflare hostname at the tunnel (step 1 above). Verify `https://wallet.thomasduong.info.vn`
   loads and sign-in works end-to-end (exercises Supabase Auth from the new origin).
3. Keep the VPS running a few days as instant rollback (revert the Cloudflare hostname). Retire the
   `api.wallet.…` record once confirmed unused.

## Trade-offs & watch-outs

- **No health-gated auto-rollback** like the old `deploy.sh`. Mitigations in place: CI test gate,
  Docker `HEALTHCHECK` on the api image, uptime-kuma alerting. Rollback is manual: in Portainer,
  redeploy from a previous commit, or `git revert` + push.
- **Build load on the laptop** each deploy (`pnpm install` + build inside Docker). First build is slow;
  subsequent builds reuse cached layers as long as `pnpm-lock.yaml` and manifests are unchanged. Fine
  on 8 GB for an infrequently-deployed personal app.
- **Supabase network restrictions.** `supabase/config.toml` has a `[db.network_restrictions]` block. If
  the hosted project allowlists the old VPS IP, the laptop's outbound (egressing via your home IP) will
  be blocked. Check the Supabase dashboard **before** cutover.
- **Webhook exposure.** Put Cloudflare Access in front of the Portainer hostname so the webhook URL
  alone isn't sufficient to trigger deploys.

## Open decisions for you

1. **Trigger:** CI→webhook (test-gated, tiny inbound call) vs. Portainer polling (zero inbound, no gate
   ordering). Draft assumes CI→webhook.
2. **Retire `api.wallet.…`?** Draft assumes yes (same-origin `/api` makes it redundant). Say if anything
   external still calls it.
3. **Repo visibility for CI cost:** Actions is free either way at your volume; noting only that a public
   repo removes even the 2000-min/month private cap.
```


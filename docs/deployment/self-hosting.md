# Self-Hosting Deployment (as built)

The app runs on a home-lab laptop (`thomas-Modern-14-B10MW`, Linux x86_64) instead of a
paid VPS. Web + API are Docker containers behind a Cloudflare Tunnel; Supabase stays in
Supabase Cloud. Deploys run on a **self-hosted GitHub Actions runner on the laptop** — a
push to `main` builds and redeploys on the box, with the full build streaming to the
Actions log.

> This replaced an earlier Portainer-webhook GitOps design. See
> [Why not the Portainer webhook](#why-not-the-portainer-webhook) for what changed and why.

## Goals & constraints

- **$0 recurring cost.** No paid registry, no paid runner, no paid tunnel. Self-hosted
  runners are free and consume no GitHub Actions minutes.
- **No image registry.** Images build on the laptop from the repo; nothing is pushed/pulled.
- **Supabase stays in Supabase Cloud** — only web + API move.
- **No open inbound ports.** Cloudflare Tunnel fronts everything; TLS terminates at the edge.
  The runner reaches out to GitHub, so no inbound is needed for deploys either.

## Architecture

```
Internet ──HTTPS──► Cloudflare edge (TLS) ──tunnel──► cloudflared (container)
                                                          │  routes wallet.thomasduong.info.vn
                                                          ▼        → web:80
                              ┌──────────── laptop / Docker ────────────┐
                              │  web  (nginx, static SPA)               │
                              │    ├─ serves SPA (try_files fallback)   │
                              │    ├─ /api/  → proxy → api:3000          │
                              │    └─ /health → proxy → api:3000         │
                              │  api  (node, bundled index.js)          │
                              │       └──► Supabase Cloud (unchanged)   │
                              │  cloudflared  (in the wallet stack)     │
                              │  + portainer, uptime-kuma, caddy,       │
                              │    postgres, tailscale (other services) │
                              │  + GitHub Actions self-hosted runner    │
                              └──────────────────────────────────────────┘
```

**Single public hostname.** The SPA calls the API same-origin (`VITE_API_BASE=/api`) and Hono
serves `/api/*`, so nginx proxies `/api/` to the api container. The old
`api.wallet.thomasduong.info.vn` subdomain is redundant and should be retired.

## Deploy flow (push to `main`)

```
git push origin main
   │
   ├─ check   (GitHub-hosted)   → pnpm typecheck + test. Quality gate; bad code fails here.
   │        │ on success (main only)
   │        ▼
   └─ deploy  (self-hosted runner ON the laptop)
            checkout →
            docker compose up -d --build --remove-orphans →
              builds web + api images locally, recreates changed containers →
            docker compose ps
            → live behind cloudflared
```

- **The build runs on the laptop, inside the runner job** — so the full `docker compose build`
  output streams to the Actions log with truthful pass/fail and history. The Actions run *is*
  the build console.
- **`check` gates `deploy`.** A failing typecheck/test fails the workflow before deploy runs.
- **`COMPOSE_PROJECT_NAME=wallet`** makes the runner manage the same stack (`wallet-web-1`,
  `wallet-api-1`, `wallet-cloudflared-1`) rather than spawning duplicates under the checkout
  directory name.

## Repo files (source of truth)

| Path | Purpose |
|---|---|
| `packages/api/Dockerfile` | Multi-stage: `node:22-slim` build → `node:22-alpine` runtime shipping only the esbuild bundle (no `node_modules`); `HEALTHCHECK` on `/health`. |
| `packages/web/Dockerfile` | Multi-stage: `node:22-slim` build (vite) → `nginx:alpine` serving `dist`; `VITE_*` + `APP_COMMIT` as build args. |
| `packages/web/nginx.conf` | SPA `try_files` fallback + reverse-proxy `/api/` and `/health` to `api:3000`. |
| `docker-compose.yml` (root) | The `wallet` stack: `api`, `web`, `cloudflared`. |
| `.github/workflows/ci.yml` | `check` (GitHub-hosted typecheck/test) + `deploy` (self-hosted build/deploy). |
| `.dockerignore` (root) | Keeps `node_modules`/`dist`/`.git`/docs out of the build context. |

> Build stages use `node:22-slim` (glibc), not alpine, to avoid musl native-module issues.
> `@wallet/shared` is consumed as TS source (`exports: ./src/index.ts`) — copied, not built.
> `api`/`web` carry `pull_policy: build` so any `compose pull` skips them instead of failing
> with `pull access denied` (they are build-only, never in a registry).

### nginx routing (`packages/web/nginx.conf`)

```nginx
location /api/ {                    # same-origin API; path forwarded unchanged (Hono basePath /api)
    proxy_pass http://api:3000;
}
location = /health { proxy_pass http://api:3000/health; }
location / { try_files $uri $uri/ /index.html; }   # SPA fallback
```

> nginx resolves the `api` upstream once at startup. `docker compose up -d` recreates both
> together so a stale IP is normally a non-issue; if it ever bites, add `resolver 127.0.0.11;`
> + a variable upstream.

## Self-hosted runner setup (one-time, on the laptop)

1. GitHub → **repo → Settings → Actions → Runners → New self-hosted runner** → **Linux / X64**.
   Run the download + `./config.sh --url … --token …` commands it shows.
2. Give the runner user Docker access (the deploy job calls `docker compose`):
   ```bash
   sudo usermod -aG docker $USER   # log out/in, or restart the service, so it applies
   ```
3. Install as a service so it survives reboots and runs headless:
   ```bash
   sudo ./svc.sh install && sudo ./svc.sh start && sudo ./svc.sh status
   ```
   It should show **Listening for Jobs** and appear green under Settings → Actions → Runners.

**Keep the repo private.** A self-hosted runner on a public repo lets fork PRs run arbitrary
code on the laptop. Fine for a private repo.

## Cloudflare Tunnel (one-time)

The `cloudflared` container in the stack connects the tunnel; its token is `TUNNEL_TOKEN`.
In the Cloudflare Zero Trust dashboard, add a public hostname (published application route):
`wallet.thomasduong.info.vn` → `http://web:80`. cloudflared shares the `wallet` Docker network,
so it reaches `web` by name.

> **Use a DEDICATED tunnel for this stack — do not reuse an existing tunnel's token.** Reusing a
> token that already has a connector elsewhere on the box gives you two connectors on one tunnel:
> Cloudflare round-robins between them and only this stack's connector can resolve `web:80`, so a
> chunk of requests 502. The service target must be the in-network name `http://web:80` — never a
> host LAN IP:port, since this stack publishes no host ports.

## Secrets (GitHub repo secrets)

The deploy job injects these; they are **not** committed. Set via `gh secret set <NAME>`:

| Secret | Used for |
|---|---|
| `SUPABASE_URL` | api runtime (server-side) |
| `SUPABASE_SECRET_KEY` | api runtime (service/secret key) |
| `VITE_SUPABASE_URL` | web build arg (compiled into bundle) + `check` job (tests import `createClient`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | web build arg + `check` job |
| `TUNNEL_TOKEN` | cloudflared |

> The `check` job needs the two `VITE_*` values because
> `packages/web/src/core/supabase.ts` calls `createClient()` at import time — tests fail with
> `supabaseUrl is required` otherwise, even though nothing hits the network.
>
> **Env var names must match exactly what `docker-compose.yml` interpolates** (`${SUPABASE_SECRET_KEY}`,
> not the old `SUPABASE_SERVICE_ROLE_KEY`). Compose only injects `${...}`-referenced names; an
> unreferenced var silently never reaches the container. A blank `SUPABASE_SECRET_KEY` lets the api
> boot healthy (`/health` doesn't touch Supabase) but every data route 500s.

## Gotchas learned

- **Docker Hub TLS timeouts** during builds (common from VN). Pre-pull bases
  (`docker pull node:22-slim node:22-alpine nginx:alpine`) or add a registry mirror in
  `/etc/docker/daemon.json`: `{ "registry-mirrors": ["https://mirror.gcr.io"] }`.
- **Runner can't reach docker.sock** — if the deploy step fails with a permission-denied on
  `/var/run/docker.sock`, the runner service started before the `docker` group applied. Restart it:
  `sudo ./svc.sh stop && sudo ./svc.sh start`.
- **Error logs showing `{}`** — pino only serializes an `Error` under the key `err`. Log
  `logger.error({ err: error }, "…")`, not `{ error }`, or you get an empty object.

## Cutover & cleanup

1. Confirm a deploy goes green end to end; `docker ps` shows fresh timestamps and `api` healthy;
   `https://wallet.thomasduong.info.vn` loads with data (a real API call, not just `/health`).
2. Point/verify the Cloudflare hostname → `web:80`; sign-in works end to end.
3. Keep the VPS as instant rollback for a few days (revert the Cloudflare hostname). Then:
   - Disable Portainer's GitOps auto-update on the `wallet` stack (avoid double-deploys).
   - Delete unused GitHub secrets (`PORTAINER_WEBHOOK_URL`, `VPS_*`) and the `ops.…` webhook
     tunnel route.
   - Retire the `api.wallet.…` DNS record.
   - Check Supabase **Network Restrictions** for a stale VPS-IP allowlist before decommissioning.

## Trade-offs & watch-outs

- **No health-gated auto-rollback** like the old VPS `deploy.sh`. Mitigations: CI test gate,
  Docker `HEALTHCHECK` on the api image, uptime-kuma alerting. Rollback is manual: `git revert` +
  push, or redeploy a previous commit.
- **Build load on the laptop** each deploy (`pnpm install` + build in Docker). First build is slow;
  later ones reuse cached layers while `pnpm-lock.yaml`/manifests are unchanged.
- **Deploys only run when the laptop is on** — the runner *is* the laptop; jobs queue if it's off.
- **uptime-kuma** monitors `https://wallet.thomasduong.info.vn/health`, but `/health` doesn't touch
  Supabase — add a monitor on a real data endpoint too to catch DB/key failures.

## Why not the Portainer webhook

The first design had CI curl a Portainer stack webhook to trigger a GitOps rebuild. It was dropped:

- **Fire-and-forget, no truthful status.** The webhook returns `204` on *acceptance*, before the
  build runs — so CI (and any GitHub deployment view built on it) went green while the actual build
  failed asynchronously on the box.
- **No visible build logs.** Build output only landed in `docker logs portainer`, an opaque blob
  with no history or per-deploy separation.
- **`compose pull` fights build-only images.** Portainer's GitOps update runs `docker compose pull`
  first, which fails with `pull access denied` for `wallet-api`/`wallet-web` (never in a registry).
  Worked around with `pull_policy: build`, but the visibility problems remained.
- **Reaching Portainer from CI was awkward** — its admin API is LAN-only, needing a path-scoped
  Cloudflare route just for the webhook endpoint.

The self-hosted runner fixes all of this: the build runs on the laptop *as the Actions job*, so the
Actions log is the real build console with history and truthful red/green, and no inbound path to
Portainer is needed. Portainer stays for inspecting/managing containers, not for deploying.

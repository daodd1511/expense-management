# Auth + Routing — Plan

Add email/password auth alongside the existing Google OAuth flow, and replace the app's
top-level state-machine navigation with TanStack Router. This is intentionally one spec:
the auth flows now require URL-aware guards and reset handling, and the router migration
should not be split away from that work or the app ends up with two navigation models.

## Scope

The spec covers:

- Email/password auth in the web app in addition to existing Google OAuth.
- Password reset request + password update completion flow.
- TanStack Router adoption for public and protected routes.
- Route-driven top-level app navigation across mobile and desktop.
- Route-addressable transaction create/edit flows.
- Auth-aware redirect handling, including "return to intended destination".

The spec does **not** replace Supabase Auth with custom API auth endpoints. The API remains
the resource server verifying Supabase JWTs; authentication itself stays in Supabase.

## Key decisions

| Topic                          | Decision                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth provider ownership        | Keep Supabase Auth as the identity provider. FE authenticates with Supabase; API continues verifying Supabase JWTs in `packages/api/src/middleware/auth.ts`. |
| Login methods                  | Support Google OAuth + email/password on the same auth surface.                                                                                              |
| Signup                         | Self-service signup from the app.                                                                                                                            |
| Verification                   | Immediate access for v1; no mandatory email verification gate.                                                                                               |
| Reset flow                     | Support forgot-password email + password update completion flow.                                                                                             |
| Auth UI shape                  | One shared auth card, but routed via nested auth routes: `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`.                                          |
| Router choice                  | TanStack Router, code-based route tree first.                                                                                                                |
| Route ownership                | Router becomes the source of truth for top-level navigation; browser back/forward must work.                                                                 |
| Route tree shape               | Public auth routes + one protected app layout.                                                                                                               |
| Responsive strategy            | One shared route tree for both mobile and desktop; layouts stay responsive presentation, not separate router trees.                                          |
| Planning/budgets/subscriptions | Normalize to distinct routes `/budgets` and `/subscriptions`; `/planning` is removed or reduced to a compatibility redirect.                                 |
| Settings categories            | Categories move under `/settings/categories`, not a top-level `/categories`.                                                                                 |
| Transaction flows              | Route-addressable: `/transactions/new` and `/transactions/$transactionId/edit`, rendered as overlay UI per viewport.                                         |
| Redirect behavior              | Unauthenticated access redirects to `/auth/sign-in` while preserving the intended destination; authenticated users are redirected away from `/auth/*`.       |
| Auth abstraction               | Centralize all auth operations behind `useAuth` / auth provider methods rather than calling Supabase directly from components.                               |
| Error handling                 | Normalize Supabase auth failures into app-owned, translated error cases rather than surfacing raw provider messages.                                         |
| Signup fields                  | `email` + `password` only for v1.                                                                                                                            |
| Validation                     | Basic client validation aligned to Supabase settings; no custom password-complexity policy.                                                                  |

## Route map

Protected routes:

- `/` — dashboard/home
- `/transactions`
- `/transactions/new`
- `/transactions/$transactionId/edit`
- `/budgets`
- `/subscriptions`
- `/accounts`
- `/settings`
- `/settings/categories`

Public-only routes:

- `/auth/sign-in`
- `/auth/sign-up`
- `/auth/forgot-password`
- `/auth/reset-password`

Notes:

- Mobile and desktop continue rendering different shells, but they resolve the same route
  locations.
- `/planning` should not remain canonical; if retained temporarily, it redirects to
  `/budgets` or `/subscriptions`.

## Architecture impact

### Backend

- No custom login/signup/reset endpoints in `packages/api`.
- `packages/api/src/middleware/auth.ts` remains the verification point for bearer tokens
  presented to app-data routes.
- API changes, if any, are limited to test coverage or auth-flow-neutral cleanup; the
  routing/auth feature itself is web-first.

### Web auth

- Expand `packages/web/src/features/auth/auth.tsx` from OAuth-only behavior into a full auth
  service surface: Google sign-in, password sign-in, password signup, reset request,
  password update, sign-out.
- Replace `AuthGate`-owns-everything with router-aware public/protected route guards.
- Add dedicated auth route components for sign-in, sign-up, forgot-password, and
  reset-password completion.

### Web routing

- Replace local `useState` top-level navigation in `packages/web/src/layouts/mobile/MobileApp.tsx`
  and `packages/web/src/layouts/desktop/DesktopApp.tsx` with router location state.
- Keep `ResponsiveApp` as the viewport switch, but feed it route-aware shells rather than
  self-owned nav state.
- Promote transaction create/edit overlays to route-backed UI, so refresh/back/deep-link
  behavior is consistent.

## Provisional phases

1. **Router foundation + auth routes** — install TanStack Router, bootstrap the code-based
   route tree, move auth loading/guards into router context, add nested auth routes and the
   expanded auth service.
2. **Protected app route migration** — convert dashboard/transactions/budgets/subscriptions/
   accounts/settings/categories to real routes and remove top-level `screen`/`tab` state
   from the mobile/desktop shells.
3. **Transaction overlay routes + polish** — make transaction create/edit route-addressable,
   wire redirect preservation end-to-end, remove obsolete auth gate/sign-in entry points,
   and close the remaining router migration cleanup/tests.

## Affected files

- Dependencies / bootstrap:
  - `packages/web/package.json`
  - `pnpm-lock.yaml`
  - `packages/web/src/main.tsx`
  - new router bootstrap files under `packages/web/src/routing/` or equivalent code-based
    router entry files
- Auth:
  - `packages/web/src/features/auth/auth.tsx`
  - `packages/web/src/features/auth/components/AuthGate.tsx` (removed or reduced)
  - `packages/web/src/features/auth/components/SignIn.tsx` (replaced)
  - new auth route components under `packages/web/src/features/auth/components/`
  - `packages/web/src/core/i18n.tsx`
- Layout/navigation:
  - `packages/web/src/layouts/ResponsiveApp.tsx`
  - `packages/web/src/layouts/mobile/MobileApp.tsx`
  - `packages/web/src/layouts/mobile/MobilePlanning.tsx`
  - `packages/web/src/layouts/desktop/DesktopApp.tsx`
  - `packages/web/src/features/settings/components/{Settings.tsx,MobileSettings.tsx}`
  - dashboard components that currently call `onNavigate`
- Transaction form flow:
  - `packages/web/src/features/transactions/components/TransactionForm.tsx`
  - `packages/web/src/features/transactions/components/{MobileTransactions.tsx,DesktopTransactionsTable.tsx}`
  - new route-aware overlay host components if needed
- Tests:
  - auth tests around `packages/web/src/core/api.test.ts` and any new auth/routing tests
  - route-aware component tests for auth pages and transaction overlay navigation

## Constraints

- Integration branch is `develop`; stacked phase branches by default.
- Frontend code must follow the repo's `react-frontend-developer` guidance.
- i18n parity is required for every new user-facing auth/routing string.
- Do not introduce direct FE-to-Postgres access; FE continues using Supabase Auth plus the
  existing API client.
- The migration should preserve current mobile/desktop visual behavior as much as practical
  while changing navigation ownership underneath.

## Non-goals

- No replacement of Supabase Auth with app-owned auth endpoints.
- No profile/bootstrap table work unless implementation exposes a concrete need that the
  current shared-category/user-owned-data model cannot satisfy.
- No route-addressable conversion of every other CRUD drawer/sheet in this spec
  (accounts/budgets/subscriptions/category forms remain eligible for a later follow-up if
  desired).
- No analytics or data-query behavior changes unrelated to navigation/auth.

## Open items

None — core scope and architecture were resolved in grilling.

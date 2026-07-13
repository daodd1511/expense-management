# Auth + Routing — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 3 — done
- Phase 1 — Router foundation + auth routes: done
- Phase 2 — Protected app route migration: done
- Phase 3 — Transaction overlay routes + cleanup: done
- Verification debt: none

## Phase 1 — Router foundation + auth routes

Branch: `auth-routing/phase-1-router-auth-foundation` (off `develop`, stacked)

This phase establishes the router and auth architecture that every downstream route depends
on. No app-shell navigation migration yet.

- [x] Add TanStack Router dependencies in `packages/web/package.json` and refresh
      `pnpm-lock.yaml`.
- [x] Replace the `AuthGate`-wrapped app entry in `packages/web/src/main.tsx` with a
      TanStack Router bootstrap (`RouterProvider`) and router context wiring for auth state.
- [x] Introduce the code-based route tree in new router entry files under
      `packages/web/src/` (router definition, route tree, and route-context typing) covering:
      public auth routes, protected app layout, and auth-aware redirect search/state.
- [x] Expand `packages/web/src/features/auth/auth.tsx` to expose:
      `signInWithGoogle`, `signInWithPassword`, `signUpWithPassword`,
      `requestPasswordReset`, `updatePassword`, and `signOut`, while keeping session/user/
      loading state subscribed to Supabase.
- [x] Replace `packages/web/src/features/auth/components/SignIn.tsx` with routed auth-page
      components for sign-in, sign-up, forgot-password, and reset-password completion under
      `packages/web/src/features/auth/components/`.
- [x] Remove or reduce `packages/web/src/features/auth/components/AuthGate.tsx` so auth
      gating happens in router guards/context instead of wrapping the full app.
- [x] Add auth error normalization and translated auth strings in
      `packages/web/src/core/i18n.tsx` plus any auth-specific helper module needed for
      stable error mapping.
- [x] Preserve redirect intent: unauthenticated protected-route access routes to
      `/auth/sign-in` with a stored return target; authenticated users are redirected away
      from `/auth/sign-in`, `/auth/sign-up`, and `/auth/forgot-password`.

**Agent gate (hard):**

- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**

- [ ] Visiting a protected URL while signed out lands on `/auth/sign-in` and, after
      successful auth, returns to the original destination.
- [ ] Google sign-in still works through the new routed auth flow.
- [ ] Email/password sign-up, sign-in, forgot-password request, and reset-password update
      all work with translated, non-raw error messages.
- [ ] A signed-in user visiting `/auth/sign-in` or `/auth/sign-up` is redirected back into
      the app instead of seeing auth forms.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — Protected app route migration

Branch: `auth-routing/phase-2-app-route-migration` (off `auth-routing/phase-1-router-auth-foundation`, stacked)

This phase converts top-level app navigation from local component state to canonical routes,
while preserving responsive presentation.

- [x] Refactor `packages/web/src/layouts/ResponsiveApp.tsx` to host responsive shells that
      render the same shared route tree on mobile and desktop rather than separate nav
      state machines.
- [x] Replace `screen` state in `packages/web/src/layouts/mobile/MobileApp.tsx` with router
      location-driven navigation for `/`, `/transactions`, `/budgets`, `/subscriptions`,
      `/accounts`, `/settings`, and `/settings/categories`.
- [x] Replace `tab` state in `packages/web/src/layouts/desktop/DesktopApp.tsx` with router
      location-driven navigation for the same canonical destinations.
- [x] Remove `packages/web/src/layouts/mobile/MobilePlanning.tsx`'s canonical inner-tab
      role by normalizing budgets and subscriptions to distinct routes; keep only route-aware
      mobile presentation if a local container still adds UI value.
- [x] Update dashboard and settings navigation call sites that currently use callbacks
      (`onNavigate`, `onNavigateToCategories`) so they navigate by route instead of mutating
      parent-local state.
- [x] Nest categories under `/settings/categories` by updating
      `packages/web/src/features/settings/components/{Settings.tsx,MobileSettings.tsx}` and
      the route tree accordingly.
- [x] Add any route-level loading/not-found handling required so route transitions do not
      regress the current loading experience.

**Agent gate (hard):**

- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**

- [ ] Browser back/forward works across dashboard, transactions, budgets, subscriptions,
      accounts, settings, and settings/categories on both mobile and desktop layouts.
- [ ] Deep-linking directly to `/subscriptions` and `/settings/categories` loads the correct
      view without intermediate tab-state glitches.
- [ ] Mobile bottom-nav and desktop sidebar still feel native to each viewport even though
      they now drive shared routes.
- [ ] `/planning` no longer behaves as the canonical destination (redirect or replacement is
      consistent).

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 3 — Transaction overlay routes + cleanup

Branch: `auth-routing/phase-3-transaction-overlay-routes` (off `auth-routing/phase-2-app-route-migration`, stacked)

This phase finishes the route migration by making the highest-value modal flow
route-addressable and removing obsolete navigation/auth scaffolding.

- [x] Add `/transactions/new` and `/transactions/$transactionId/edit` to the route tree and
      render them as viewport-specific overlays (mobile `BottomSheet`, desktop `Drawer`)
      rather than local `sheetOpen`/`drawerOpen` state.
- [x] Refactor transaction-entry call sites in
      `packages/web/src/layouts/mobile/MobileApp.tsx`,
      `packages/web/src/layouts/desktop/DesktopApp.tsx`,
      `packages/web/src/features/transactions/components/MobileTransactions.tsx`, and
      `packages/web/src/features/transactions/components/DesktopTransactionsTable.tsx` to
      navigate to overlay routes instead of mutating parent-local open/edit state.
- [x] Update `packages/web/src/features/transactions/components/TransactionForm.tsx` and any
      new route host components so submit/cancel closes via navigation and preserves return
      behavior correctly.
- [x] Delete obsolete auth/navigation entry points that are fully superseded by the router
      migration (legacy `SignIn` implementation, dead auth gate wiring, dead top-level nav
      state helpers).
- [x] Add or update routing/auth tests covering deep links to transaction create/edit routes,
      cancel/back behavior, and auth redirect preservation through a protected overlay URL.

**Agent gate (hard):**

- [x] `pnpm --filter @wallet/web typecheck`
- [x] `pnpm --filter @wallet/web test`
- [x] `pnpm --filter @wallet/web build`

**Review checklist (user, at PR review):**

- [ ] Opening "add transaction" changes the URL to `/transactions/new`; closing/canceling
      returns to the previous route on both mobile and desktop.
- [ ] Editing a transaction from the list changes the URL to
      `/transactions/<id>/edit`; refresh preserves the edit state correctly.
- [ ] Browser back closes the transaction overlay before leaving the parent screen.
- [ ] Deep-linking to a protected transaction overlay while signed out redirects through
      auth and then lands on the intended overlay route after login.

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

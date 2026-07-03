# Error Handling — Execution Plan

Spec: [PLAN.md](PLAN.md). Workflow rules: see `CLAUDE.md` → "Spec-Driven Execution Workflow".

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

**Base branch note:** Phase 1 bases off `main` — `category-redesign` and `category-ux` are
both merged (see root git log), so `main` already has `favorites.ts`, `CategoryForm.tsx`,
etc. No stacking debt from prior specs.

All phases after Phase 1 stack sequentially on each other (`phase-2` off `phase-1`, etc.),
per the normal rule. Do not start a phase's PR/push without explicit confirmation even if
the phase's commits are already authorized.

---

## Phase 1 — BE Error Mapping

Branch: `error-handling/phase-1-be-error-mapping` (off `main`)

Backend only — no FE dependency, independently verifiable and revertable.

- [ ] `packages/api/src/lib/http.ts`: new `mapDbError(c, error)` helper — inspect
      `error.code`: `23505` → `409` clean message, `23503` → `409`/`400` (decide per call
      site per PLAN.md's Open Items note), default → `console.error(error)` + `500` generic
      `"Internal server error"` (raw Postgres message dropped from response body)
- [ ] Replace every `if (error) return jsonError(c, 500, error.message)` across all 6 route
      files with `if (error) return mapDbError(c, error)`:
      `packages/api/src/routes/categories.ts`, `favorites.ts`, `budgets.ts`,
      `transactions.ts`, `accounts.ts`, `subscriptions.ts` (~50 sites total per PLAN.md's
      survey)
- [ ] `packages/api/src/routes/categories.ts` PATCH handler: fold its hand-rolled
      JSON-parse-plus-manual-check into the shared `parseJsonBody` helper (noticed during
      survey, fix while already touching this file for `mapDbError`)
- [ ] `packages/api/src/middleware/auth.ts`: replace direct `c.json({error: '...'}, 401)`
      calls (~lines 33, 43, 47) with `jsonError(c, 401, '...')`
- [ ] `packages/api/src/index.ts`: add global `app.onError((err, c) => { console.error(err);
      return jsonError(c, 500, 'Internal server error') })`

**Verification gate (hard):**
- [ ] `pnpm --filter @wallet/api typecheck` passes
- [ ] `pnpm --filter @wallet/api test` passes — add/update test cases per route file
      covering: a `23505` conflict now returns `409` (not `500`), a generic DB error still
      returns `500` with a generic (non-Postgres-leaking) message, `auth.ts`'s 401 responses
      still match the `{error}` shape
- [ ] Manual check: with the dev API running, trigger a real unique-constraint conflict
      (e.g. `POST /favorites` twice with the same `categoryId`) and confirm `409` +
      clean message, not `500` + raw Postgres text

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 2 — FE Error Infrastructure

Branch: `error-handling/phase-2-fe-error-infra` (off `phase-1`)

Foundational plumbing consumed by Phase 3 — no visible behavior change to existing forms
yet (their `onSubmit` signatures don't change until Phase 3), but every failed mutation
already starts toasting once this lands, since it's wired at the `QueryClient` level.

- [ ] Add `sonner` dependency to `packages/web`
- [ ] `packages/web/src/core/api.ts`: new `class ApiError extends Error { status: number;
      details?: unknown }`; `apiFetch` throws `ApiError` instead of plain `Error` on
      non-2xx (using `response.status` and the BE's `details` field if present); the
      "Missing auth session" throw becomes `new ApiError(msg, 401)`
- [ ] `packages/web/src/core/i18n.tsx`: new keys, VI + EN — `error.badRequest`,
      `error.server`, `error.boundary.title`, `error.boundary.reload` (exact copy is an
      implementation-time judgment call per PLAN.md's Open Items)
- [ ] `packages/web/src/main.tsx`: construct `QueryClient` with a `MutationCache` whose
      `onError` shows a `sonner` toast — message selected by
      `error instanceof ApiError ? (error.status < 500 ? t('error.badRequest') :
      t('error.server')) : t('error.server')`; add `<Toaster />` near the root
- [ ] New `packages/web/src/core/ErrorBoundary.tsx` (or `shared/components/`): class
      component, fallback UI using `error.boundary.title`/`error.boundary.reload` i18n keys,
      no telemetry (none exists to wire into)
- [ ] `packages/web/src/main.tsx`: wrap the app in `ErrorBoundary`, placed below
      `QueryClientProvider` per PLAN.md

**Verification gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck` passes
- [ ] `pnpm --filter @wallet/web test` passes — add test cases: `apiFetch` throws `ApiError`
      with correct `status` on a non-2xx mock response; `MutationCache.onError` triggers a
      toast (can assert via mocking `sonner`'s `toast` export) on a failing mutation
- [ ] Manual check: run dev server, force an existing mutation to fail (e.g. temporarily
      stop the API, or trigger a real conflict from Phase 1's manual-check scenario) and
      confirm a toast appears with the generic message. Also verify a forced render error
      (e.g. temporarily throw in a component) is caught by the boundary instead of a white
      screen — revert the forced-throw before committing

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 3 — FE Forms: Inline Errors + Retained Input

Branch: `error-handling/phase-3-fe-forms-inline-errors` (off `phase-2`)

The user-visible payoff: failed mutations no longer silently no-op — form stays open,
input intact, inline banner shown (toast already fires automatically from Phase 2).

- [ ] `packages/web/src/core/store.tsx`: all 19 mutation-triggering callbacks (per PLAN.md's
      count — `addTransaction`, `addFavorite`, etc.) become `async`, using
      `await xMutation.mutateAsync(...)` instead of `.mutate(...)`; on failure they rethrow
      (no local catch — `MutationCache.onError` from Phase 2 already handles the toast)
- [ ] Update `StoreValue` interface / callback prop types to reflect the new
      `Promise<void>`-returning signatures
- [ ] All 5 forms — `TransactionForm.tsx`, `CategoryForm.tsx`, `BudgetForm.tsx`,
      `AccountForm.tsx`, `SubscriptionForm.tsx`: change `onSubmit` prop type from
      `(data) => void` to `(data) => Promise<void>`; submit handler wraps
      `await onSubmit(data)` in try/catch; catch sets local `formError` boolean/message
      state; render a banner at the top of the form body when set, using
      `error.badRequest`/`error.server`-style generic copy (implementation choice: extract
      a shared `useFormSubmit` hook vs. duplicate per form — either is fine per PLAN.md's
      Open Items, pick whichever reads cleaner once the first form is done)
- [ ] Confirm no form clears its own input state before `onSubmit` resolves (should already
      be true today since nothing awaits currently — verify, don't just assume)

**Verification gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck` passes
- [ ] `pnpm --filter @wallet/web test` passes — existing form tests updated for the new
      async `onSubmit` signature (mock `onSubmit` becomes `vi.fn(async () => {})` or
      similar); add at least one new test per form (or one for the shared hook, if
      extracted) asserting: `onSubmit` rejecting → form stays rendered, inline banner
      appears, input values unchanged
- [ ] Manual check per form (all 5): trigger a failure (reuse Phase 1's real-conflict
      scenario where applicable, e.g. add a duplicate-favorite-adjacent budget conflict; for
      others, temporarily stop the API) → confirm toast fires, form stays open, banner
      shows, previously-entered values are still in the inputs. Then fix the underlying
      cause and resubmit successfully to confirm the happy path still closes the form as
      before

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete all three phase branches.

# Error Handling — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".

## STATUS

- Current phase: All phases complete
- Phase 1 — BE error mapping: `done`
- Phase 2 — FE error display: `done`
- Phase 3 — Manual tests: `done-with-debt`
- Verification debt: manual browser checks (3 items) deferred; review checklist incomplete

---

Read order for any agent picking this up: `HANDOFF.md` (root) → this file → `PLAN.md`.

**Base branch note:** Phase 1 bases off `main` — `category-redesign` and `category-ux` are
both merged (see root git log), so `main` already has `favorites.ts`, `CategoryForm.tsx`,
etc. No stacking debt from prior specs.

All phases after Phase 1 stack sequentially on each other (`phase-2` off `phase-1`, etc.),
per the normal rule. Do not start a phase's PR/push without explicit confirmation even if
the phase's commits are already authorized.

---

## Phase 1 — BE Error Mapping

Branch: `error-handling/phase-1-be-error-mapping` (off `develop` — `main` note predates
`develop`'s creation, same fix applied as `pwa`)

Backend only — no FE dependency, independently verifiable and revertable.

- [x] `packages/api/src/lib/http.ts`: new `mapDbError(c, error)` helper — inspects
      `error.code`: `23505` → `409` "This item already exists", `23503` → `409` "This
      action conflicts with related data", default → `console.error('[db] unexpected
      error:', error)` + `500` generic `"Internal server error"` (raw Postgres message
      dropped from the response body, only reaches server logs). `DbError` type exported
      for consumers that need to carry an error through an intermediate result type (see
      `categories.ts` note below)
- [x] Replaced every `if (error) return jsonError(c, 500, error.message)` (and inline
      variants like `if (x.error) return jsonError(c, 500, x.error.message)`) across all 6
      route files with `mapDbError(c, error)` — `categories.ts`, `favorites.ts`,
      `budgets.ts`, `transactions.ts`, `accounts.ts`, `subscriptions.ts`. Row-shape
      validation failures (Zod `safeParse` after insert/update, e.g. `'Inserted category
      failed validation'`) were left as `jsonError` — those aren't Postgres errors, `mapDbError`
      doesn't apply
- [x] `categories.ts`'s `loadParentCandidate` helper previously discarded the Postgres
      error code (returned only `.message` as a plain string), so its two call sites
      couldn't route through `mapDbError`. Fixed by changing `ParentCandidateResult`'s
      error variant to carry the full `DbError` instead of a string
- [x] `categories.ts` PATCH handler: extracted a new `parseRawJsonBody(c)` helper in
      `http.ts` (JSON-parse-with-try/catch only, no schema) shared by `parseJsonBody`
      internally and by this handler directly — needed because `categoryPatchSchema`
      doesn't include `type` at all, so schema validation alone would silently strip an
      attempted `type` field rather than rejecting it with the specific "type is immutable"
      message this handler intentionally gives. The hand-rolled `c.req.json()` try/catch
      duplication is gone; the immutability check itself stays (it can't be expressed as
      schema validation without losing the specific error message)
- [x] `packages/api/src/middleware/auth.ts`: replaced direct `c.json({error: '...'}, 401)`
      calls with `jsonError(c, 401, '...')`
- [x] `packages/api/src/index.ts`: added global
      `app.onError((err, c) => { console.error('[uncaught]', err); return jsonError(c, 500,
      'Internal server error') })`

**Verification gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck` passes
- [x] `pnpm --filter @wallet/api test` passes — 24/24 (20 prior + 4 new in `http.test.ts`'s
      `mapDbError` suite: `23505` → 409 clean message, `23503` → 409 clean message,
      unrecognized code → 500 generic message with no Postgres text leaked, and a
      `console.error` call assertion for the logging path). `auth.test.ts`'s existing 3
      cases pass unchanged, confirming the `{error}` response shape is unaffected by
      routing through `jsonError` instead of raw `c.json`
- [ ] Manual check: with the dev API running, trigger a real unique-constraint conflict
      (e.g. `POST /favorites` twice with the same `categoryId`) and confirm `409` + clean
      message, not `500` + raw Postgres text — **not run**, this requires a real
      authenticated Supabase session (JWT) to pass `authMiddleware`, not practical to
      script without a login flow. Substituted: `PostgrestError`'s own type documentation
      (`node_modules/.../PostgrestError.ts`) confirms `.code` carries the real Postgres
      SQLSTATE (e.g. `23505`, `42501`) for constraint-level errors, not just
      PostgREST-specific codes — so `mapDbError`'s branching targets the right values, and
      the unit tests above exercise the exact mapping logic against that documented
      contract. The remaining gap is purely "does this specific deployment's Supabase
      instance behave per that documented contract," which is an external-service
      assumption, not something this codebase controls.

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 2 — FE Error Infrastructure

Branch: `error-handling/phase-2-fe-error-infra` (off `phase-1`)

Foundational plumbing consumed by Phase 3 — no visible behavior change to existing forms
yet (their `onSubmit` signatures don't change until Phase 3), but every failed mutation
already starts toasting once this lands, since it's wired at the `QueryClient` level.

- [x] Added `sonner` dependency to `packages/web`
- [x] `packages/web/src/core/api.ts`: new `class ApiError extends Error { status: number;
      details?: unknown }`; `apiFetch` throws `ApiError` instead of plain `Error` on
      non-2xx (using `response.status` and the BE's `details` field, now captured via an
      extended `apiErrorSchema`); the "Missing auth session" throw becomes
      `new ApiError('Missing auth session', 401)`
- [x] `packages/web/src/core/i18n.tsx`: new keys, VI + EN — `error.badRequest`,
      `error.server`, `error.boundary.title`, `error.boundary.reload`. Also added an
      exported `translate(key, vars?)` helper that reads the current language directly
      from `localStorage` (not `useLang()`'s context) — needed because the
      `MutationCache.onError` handler runs outside the React tree, where no `LangContext`
      exists to read from
- [x] `packages/web/src/core/mutationErrorHandler.ts` (new, not inline in `main.tsx` as
      originally sketched — extracted so the status-family branching logic is unit
      testable without mounting the whole app): `handleMutationError(error)` shows a
      `sonner` toast, message selected by `error instanceof ApiError && error.status < 500
      ? translate('error.badRequest') : translate('error.server')`. `main.tsx` constructs
      `QueryClient` with `mutationCache: new MutationCache({ onError: handleMutationError
      })`, adds `<Toaster richColors position="top-center" />` near the root
- [x] New `packages/web/src/core/ErrorBoundary.tsx`: class component
      (`ErrorBoundaryImpl`) wrapped by a function component (`ErrorBoundary`) that supplies
      i18n'd copy via props — React error boundaries must be class components with no hook
      equivalent, so `useLang()` can't be called directly inside one. Fallback UI uses
      `error.boundary.title`/`error.boundary.reload`, no telemetry (none exists to wire
      into)
- [x] `packages/web/src/main.tsx`: wrapped the app in `ErrorBoundary` — **placement
      differs from the original sketch**: nested inside `LangProvider` (around
      `AuthGate`/`StoreProvider`/`ResponsiveApp` only), not directly below
      `QueryClientProvider` as first written. `ErrorBoundary` itself calls `useLang()` for
      its fallback text, so it must render *inside* `LangProvider`'s subtree, not above it
      — placing it directly below `QueryClientProvider` (above `LangProvider`) would throw
      immediately ("useLang must be used within LangProvider"). This also means a crash in
      `AuthProvider`/`ThemeProvider`/`LangProvider` themselves isn't caught, but those are
      simple context providers, not realistic crash sites — the actual feature tree
      (`AuthGate`, `StoreProvider`, `ResponsiveApp`) is fully covered

**Verification gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` passes
- [x] `pnpm --filter @wallet/web test` passes — 34/34 (26 prior + 2 new `api.test.ts` cases
      for `ApiError`'s `status`/`details` + 3 new `mutationErrorHandler.test.ts` cases:
      4xx → `error.badRequest`, 5xx → `error.server`, non-`ApiError` → `error.server`)
- [x] `pnpm --filter @wallet/web build` succeeds
- [ ] Manual check: run dev server, force an existing mutation to fail and confirm a toast
      appears with the generic message; verify a forced render error is caught by the
      boundary instead of a white screen — **not run**, no browser automation tool
      available this session, consistent with every other manual-check item this session.
      Dev server smoke-checked instead (`pnpm dev` → curl `/` → 200). The
      `mutationErrorHandler`/`ErrorBoundary` unit tests cover the underlying logic
      directly, but the actual toast rendering and boundary fallback UI in a real browser
      haven't been visually confirmed

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR.

---

## Phase 3 — FE Forms: Inline Errors + Retained Input

Branch: `error-handling/phase-3-fe-forms-inline-errors` (off `phase-2`)

The user-visible payoff: failed mutations no longer silently no-op — form stays open,
input intact, inline banner shown (toast already fires automatically from Phase 2).

- [x] `packages/web/src/core/store.tsx`: all 19 mutation-triggering callbacks (`addTransaction`,
      `updateTransaction`, `deleteTransaction`, `deleteTransactions` (bulk — converted the
      existing per-id `.mutate()` loop to `Promise.all(ids.map(id => deleteTx.mutateAsync(id)))`,
      preserving its existing per-id endpoint usage rather than switching to the unused
      `useDeleteTransactions` bulk hook — out of scope, flagged but not touched),
      `addAccount`, `updateAccount`, `deleteAccount`, `addCategory`, `updateCategory`,
      `deleteCategory`, `addFavorite`, `removeFavorite`, `addBudget`, `updateBudget`,
      `deleteBudget`, `addSubscription`, `updateSubscription`, `deleteSubscription`,
      `logSubscription`) are now `async`, using `await xMutation.mutateAsync(...)` instead
      of `.mutate(...)`; on failure they rethrow (no local catch — `MutationCache.onError`
      from Phase 2 already handles the toast)
- [x] `StoreValue` interface's callback signatures all changed from `=> void` to
      `=> Promise<void>`
- [x] Shared `packages/web/src/shared/hooks/useFormSubmit.ts` (extracted rather than
      duplicated per form — picked after seeing the try/catch + banner-state pattern would
      be identical across all 5): wraps an async `onSubmit`, exposes `{ submit,
      isSubmitting, errorMessage }`; on rejection sets `errorMessage` via a shared
      `isClientError(error)` classifier (new export in `core/api.ts`, also used by
      Phase 2's `mutationErrorHandler` — extracted so both classify failures identically)
      picking between `error.badRequest`/`error.server` copy. Also added
      `packages/web/src/shared/components/FormErrorBanner.tsx` for the shared banner UI
- [x] All 5 forms — `TransactionForm.tsx`, `CategoryForm.tsx`, `BudgetForm.tsx`,
      `AccountForm.tsx`, `SubscriptionForm.tsx`: `onSubmit` prop type changed to
      `Promise<void>`-returning, each wired through `useFormSubmit`, `FormErrorBanner`
      rendered when `errorMessage` is set. `CategoryForm.tsx` has two independent mutations
      (`onSave`/`onDelete`) — wired through two separate `useFormSubmit` calls, banner shows
      whichever failed most recently (`saveError ?? deleteError`)
- [x] Every screen-level caller of these 5 forms (`CategoriesPage.tsx`,
      `MobileBudgets.tsx`/`DesktopBudgets.tsx`, `MobileAccounts.tsx`/`DesktopAccounts.tsx`,
      `MobileSubscriptions.tsx`/`DesktopSubscriptions.tsx`, `MobileApp.tsx`/`DesktopApp.tsx`)
      had its submit handler changed to `async`, `await`-ing the store call and only
      closing the form/sheet/drawer *after* that await succeeds — previously these closed
      unconditionally right after firing `.mutate()`, so a failure and a success looked
      identical to the user (form always closed). This was the actual behavior change that
      makes "form stays open on failure" true, not just the `useFormSubmit` plumbing itself
- [x] Confirmed no form clears its own input state before `onSubmit` resolves — true before
      this phase (nothing awaited) and still true now (state is only reset via `onCancel`/
      unmount, never inside the submit path)

**Verification gate (hard):**
- [x] `pnpm --filter @wallet/web typecheck` passes
- [x] `pnpm --filter @wallet/web test` passes — 39/39 (34 prior + 4 new
      `useFormSubmit.test.ts` cases covering success/4xx/5xx/error-clearing-on-retry, + 1
      new integration test in `TransactionForm.test.tsx` asserting the full wiring:
      `onSubmit` rejecting → banner (`role="alert"`) appears, the Merchant input keeps its
      typed value, the Save button is still present — i.e. the form genuinely stayed
      mounted, not just the hook's internal state in isolation). Existing
      `TransactionForm.test.tsx` mocks updated from bare `vi.fn()` to
      `vi.fn().mockResolvedValue(undefined)` — the old mocks returned `undefined` instead
      of a `Promise`, which `useFormSubmit`'s `.catch()` chain would have thrown on;
      caught this by actually running the suite, not just typechecking (TS allows a
      `Promise<void>`-returning prop to silently accept a `void`-returning mock at the
      type level, so this was a runtime-only gap)
- [x] `pnpm --filter @wallet/web build` succeeds
- [ ] Manual check per form (all 5): trigger a failure and confirm toast fires, form stays
      open, banner shows, previously-entered values are still in the inputs; then fix the
      underlying cause and resubmit successfully to confirm the happy path still closes the
      form as before — **not run**, no browser automation tool available this session,
      consistent with every manual-check item across both specs this session. Dev server
      smoke-checked instead (`pnpm dev` → curl `/` → 200). The integration test above
      covers one form (`TransactionForm`) exercising the real component tree, not a mock;
      the other 4 forms share the identical `useFormSubmit`/`FormErrorBanner` wiring but
      haven't each been individually exercised in a real browser

**On completion:** update this checklist, update root `HANDOFF.md`, stop and ask before
push/PR. This is the final phase — after merge, delete all three phase branches.

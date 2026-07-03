# Error Handling Plan

Produced via `/grill-me` interview. All decisions below were explicitly confirmed; do not
reinterpret or expand scope without re-confirming.

## Motivation

Survey of current state (see interview) found error handling is effectively absent on both
sides:

- **BE**: every Supabase `{data, error}` failure collapses to `500` with the raw Postgres
  message passed straight through to the client (`~50` sites across 6 route files). No
  `error.code` inspection — a duplicate-favorite insert and a DB outage look identical to the
  client. No `app.onError` — uncaught exceptions fall through to Hono's bare-text default,
  breaking the FE's JSON parse. No error logging anywhere.
- **FE**: `onError`/`isError` are used nowhere. 19 fire-and-forget `.mutate()` calls in
  `store.tsx` mean a failed mutation is a silent no-op — no toast, no inline message, not even
  a console log. `apiFetch` throws a plain `Error` with no status code attached, so even if a
  component wanted to react differently to a 400 vs a 500, it couldn't. No toast library, no
  React error boundary.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| BE: Postgres error → HTTP status mapping | Add `mapDbError` helper inspecting `error.code` (`23505` unique → `409`, `23503` FK → `409`/`400`, else → `500`), replacing all `if (error) return jsonError(c, 500, error.message)` sites | Best-practice: distinguish user-fixable conflicts from real server errors; matches best-practices scope answer |
| BE: response body on 500 | Generic message only, raw Postgres text dropped from client response | Internals (constraint/table names) shouldn't leak to clients |
| BE: scope | Apply uniformly across all 6 route files (`categories`, `favorites`, `budgets`, `transactions`, `accounts`, `subscriptions`) in one pass, including fixing `auth.ts`'s direct `c.json(...)` calls to use the shared `jsonError` helper | Consistency principle — no resource-by-resource special-casing |
| BE: uncaught exceptions | Add global `app.onError` in `index.ts` → `jsonError(c, 500, 'Internal server error')` | Currently falls through to Hono's bare-text 500, breaking FE's JSON parse |
| BE: logging | `console.error` at two centralized points: inside `mapDbError` (full Postgres error incl. code/message) and inside `app.onError` (error + stack + request path/method) | No existing log infra to justify a new dependency; centralizing avoids scattering `console.error` across every route |
| BE: error message localization | Not attempted — BE keeps sending English prose; FE ignores it for display (see FE row below) | Proper i18n'd error codes is bigger scope (touches every `jsonError` call site); deferred |
| FE: toast library | `sonner` | Consistent with existing small-dep conventions (`@base-ui/react`, `lucide-react`); hand-rolling stacking/dismiss is wasted effort |
| FE: what happens on mutation failure | Toast (generic message) + form stays open with input intact + inline banner near the form referencing the failure | User-specified: don't lose input, make failure visible in two ways |
| FE: `apiFetch` error type | Custom `ApiError extends Error { status: number; details?: unknown }`, thrown instead of plain `Error` | Needed to branch behavior by status family; also stops discarding the Zod `details` the BE already sends |
| FE: wiring pattern | `store.tsx` mutation callbacks become `async` (`await mutateAsync(...)`, rethrow on failure) instead of fire-and-forget `.mutate()`. Forms `await onSubmit(tx)` in try/catch, catch sets local `formError` state for the inline banner | Avoids threading mutation objects (`isPending`/`error`) through every form's props; keeps existing callback-based architecture, changes only its signature to `Promise<void>` |
| FE: toast trigger | Global `MutationCache.onError` configured on the `QueryClient` in `main.tsx` — fires automatically for every mutation failure, no per-call-site wiring needed | DRY across all 19 existing `.mutate()` sites; the local try/catch (above) only needs to handle the inline-banner part, not the toast |
| FE: inline error scope | All 5 forms uniformly (Transaction, Category, Budget, Account, Subscription) | Consistency — same principle as BE scope decision |
| FE: inline error granularity | Single banner at top of form with a generic message, not per-field mapping from Zod `details.fieldErrors` | Most write failures here are 409 conflicts or 500s that don't map to one field; real per-field validation already happens client-side before submit |
| FE: error message text | Status-family-based generic i18n'd messages (`400`/`409` → "Couldn't save — check your input and try again", `500`/network → "Something went wrong — try again"), BE's specific message text not surfaced to the user at all | Avoids needing BE error codes/i18n (deferred item above); still logged to devtools via the thrown `ApiError` for debugging |
| FE: React error boundary | One top-level boundary in `main.tsx`, below `QueryClientProvider`, simple "Something went wrong — reload" fallback | Cheap safety net against render-time crashes; per-screen boundaries would be over-engineering for this app's size |
| FE: success toasts | Not added — error-only, per original scope | Avoids scope creep beyond "review and properly handle errors"; flagged as a possible follow-up |
| FE: mutation retry | None (keep TanStack Query's default of 0 retries for mutations) | Auto-retrying a user-initiated write risks double-submit semantics if the first attempt actually succeeded server-side; simpler to surface the error and let the user retry manually |

---

## BE Changes

`packages/api/src/lib/http.ts`:
- New `mapDbError(c, error): Response` — inspects `error.code`:
  - `23505` → `409`, clean message (e.g. "This item already exists")
  - `23503` → `409` (or `400` if the violation is an invalid reference on insert — decide per
    call site at implementation time), clean message
  - default → `console.error(full error)`, then `500` with generic `"Internal server error"`
    (raw Postgres message not included in the response body)
- Existing `jsonError(c, status, error, details?)` helper unchanged, still used for
  domain-level checks (404s, 409s from app-logic like "category has children").

All 6 route files (`categories.ts`, `favorites.ts`, `budgets.ts`, `transactions.ts`,
`accounts.ts`, `subscriptions.ts`): replace every
`if (error) return jsonError(c, 500, error.message)` with `if (error) return mapDbError(c, error)`.

`packages/api/src/middleware/auth.ts`: replace direct `c.json({error: '...'}, 401)` calls
(lines ~33, 43, 47) with `jsonError(c, 401, '...')` for consistency.

`packages/api/src/index.ts`: add
```ts
app.onError((err, c) => {
  console.error(err)
  return jsonError(c, 500, 'Internal server error')
})
```

`categories.ts` PATCH handler: fold its hand-rolled JSON-parse-plus-manual-check into the
shared `parseJsonBody` helper while touching this file for the `mapDbError` change (removes
existing duplication, noticed during the survey).

---

## FE Changes

### API client (`packages/web/src/core/api.ts`)

- New `class ApiError extends Error { status: number; details?: unknown }`.
- `apiFetch` throws `new ApiError(message, response.status, parsedBody?.details)` instead of
  plain `Error` on non-2xx. The "Missing auth session" throw becomes `new ApiError(msg, 401)`
  for consistency (treated as an auth failure, not a distinct error type).

### QueryClient (`packages/web/src/main.tsx`)

- Add `queryClient`'s `MutationCache` config (via `new QueryClient({ mutationCache: new MutationCache({ onError }) , ... })`):
  `onError` shows a `sonner` toast with a status-family-based generic i18n'd message, derived
  from `error instanceof ApiError ? error.status : undefined`.
- Add `<Toaster />` (sonner) near the root, and the top-level `ErrorBoundary` wrapping the app
  below `QueryClientProvider`.

### Error boundary

- New `packages/web/src/core/ErrorBoundary.tsx` (or `shared/components/`) — simple class
  component, fallback UI with a reload button, no telemetry/reporting (none exists to wire
  into).

### `store.tsx`

- All mutation-triggering callbacks (`addTransaction`, `addFavorite`, etc. — the 19 sites
  currently calling `.mutate(...)`) become `async`, using `await xMutation.mutateAsync(...)`.
  On failure they rethrow (no local catch) — the global `MutationCache.onError` handles the
  toast, and the caller (form) handles the inline banner.

### Forms (all 5: Transaction, Category, Budget, Account, Subscription)

- `onSubmit` prop type changes from `(data) => void` to `(data) => Promise<void>`.
- Each form's submit handler: `try { await onSubmit(data) } catch { setFormError(true) }` (or
  a shared `useFormSubmit` hook if the pattern is identical enough across all 5 — decide at
  implementation time whether to extract one).
- On error: form stays open, inputs retain their values (already true today since nothing
  currently clears them on failure — this is preserved, not newly built), a banner renders at
  the top of the form body with the generic i18n'd message.
- On success: existing behavior unchanged (form closes/dialog dismisses).

### i18n (`packages/web/src/core/i18n.tsx`)

- New keys, VI + EN: `error.badRequest` (400/409 family), `error.server` (500/network
  family), `error.boundary.title`, `error.boundary.reload`.

---

## Explicitly Out of Scope

- Success toasts
- Per-field inline validation error mapping from Zod `details.fieldErrors`
- BE error codes / localized BE error messages (English prose stays, FE ignores it for
  display)
- Mutation auto-retry
- Per-screen error boundaries (only one top-level boundary)
- Structured logging library (pino etc.) — `console.error` only
- Any change to the system-category-editability gap logged in root `HANDOFF.md` — unrelated,
  still parked separately

## Open Items for Implementation Time

- Exact wording for each generic i18n'd error message (VI + EN copy) — not decided during the
  interview, straightforward to fill in during execution.
- Whether to extract a shared `useFormSubmit` hook across the 5 forms or duplicate the
  try/catch in each — implementation detail, doesn't change behavior either way.
- `23503` (FK violation) status code (`409` vs `400`) may vary per call site depending on
  whether the violation is "referenced row doesn't exist" (400-ish) vs "can't delete, still
  referenced" (409) — decide per site when the specific case is hit; most FK-violation sites
  in this codebase are actually already caught by existing pre-emptive app-logic checks (e.g.
  `categories.ts`'s child-check before delete), so this may rarely trigger in practice.

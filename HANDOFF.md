# Handoff — error-handling Spec Complete (All 3 Phases), pwa Merged to develop

## Context

- Repo: `/Users/thomasduong/dev/personal/wallet2/personal-expense-management-app`
- Branch: `error-handling/phase-3-fe-forms-inline-errors` (off `phase-2` off `phase-1` off
  `develop`)
- `pwa` (both phases) is merged into `develop` — user merged it directly and this session
  confirmed via `git pull --rebase` (fast-forwarded cleanly, 12 commits, includes the icon
  redesign, offline banner, and the `CLAUDE.md` one-spec-at-a-time rule).
- `main`/`develop`: `category-redesign` and `category-ux` are both fully merged to `main`
  via GitHub PRs from a prior session. `develop` is the integration branch going forward —
  features land there first, `main` only merges once mature. `develop` itself is not
  pushed to `origin` by this session (user manages that).
- **Workflow rule, now on `develop`**: one spec in flight at a time — don't start/resume a
  different spec's phase while another has an unfinished phase. This was added after a
  real incident this session (see below) and is worth re-reading in `CLAUDE.md` → "Spec-
  Driven Execution Workflow" before picking up either spec listed here.
- Also on `main`/`develop` but **uncommitted in the working tree as of last check**: a
  Bun→Node runtime migration for `packages/api`. Reviewed this session — one confirmed bug:
  `packages/api/package.json`'s `dev` script (`pnpm build && node --watch dist/index.js`)
  watches the bundled output, not source, so local dev edits don't trigger a reload. Not
  fixed, not blocking.

## Spec 1: `error-handling` — Complete (All 3 Phases), Not Pushed

`specs/error-handling/PLAN.md` + `specs/error-handling/EXECUTION.md`, executed via 3
stacked branches, all done: `error-handling/phase-1-be-error-mapping` (off `develop`) →
`phase-2-fe-error-infra` → `phase-3-fe-forms-inline-errors`.

**Note on how Phase 1 started**: it was begun once earlier this session, then explicitly
stopped mid-work because `pwa` still had an unfinished phase (user: "let's finish pwa
first... update rule on this, I don't want this to happen again" — this is what produced
the one-spec-at-a-time `CLAUDE.md` rule above). The in-progress work was `git stash`'d and
the branch deleted at that point. When `error-handling` was picked back up (after `pwa`
fully landed on `develop`), the stash was found still valid, popped, and completed —
`git stash list` should be empty now, but worth checking if picking this up mid-flight.

### Phase 1 — BE Error Mapping: done

- `packages/api/src/lib/http.ts`: `mapDbError(c, error)` maps Postgres `error.code` —
  `23505` → 409, `23503` → 409, else → 500 generic (raw Postgres message never reaches the
  client, only `console.error`). Applied across all 6 route files (~50 sites), replacing
  `jsonError(c, 500, error.message)`.
- Fixed `categories.ts`'s `loadParentCandidate` helper, which discarded the Postgres error
  code entirely (returned only `.message` as a string) — changed to carry the full
  exported `DbError` type so its two call sites route through `mapDbError` correctly.
- Extracted `parseRawJsonBody` (JSON-parse-only, no schema) into `http.ts`, shared by
  `parseJsonBody` and by `categories.ts`'s PATCH handler directly — that handler needs the
  raw body to reject an attempted `type` field with a specific message before schema
  validation would silently strip it.
- `auth.ts` now uses `jsonError` instead of raw `c.json(...)`; `index.ts` has a global
  `app.onError` catching anything that isn't a Supabase `{data,error}` shape.
- Gate: `tsc` clean, 24/24 tests (4 new `mapDbError` cases). Live-conflict manual check
  **not run** (needs a real Supabase JWT, not scriptable here) — substituted with
  `PostgrestError`'s own type docs confirming `.code` carries real Postgres SQLSTATEs.

### Phase 2 — FE Error Infrastructure: done

- `sonner` added. `core/api.ts`: new `ApiError` class (`status`, `details`), `apiFetch`
  throws it instead of a plain `Error`; also exports `isClientError(error)` (status < 500)
  shared by both the toast handler and Phase 3's form hook.
- `core/mutationErrorHandler.ts` (extracted, not inline in `main.tsx`, so it's unit
  testable): `handleMutationError` shows a generic toast, wired via
  `new QueryClient({ mutationCache: new MutationCache({ onError: handleMutationError }) })`.
- `core/ErrorBoundary.tsx`: class component wrapped by a function component (hooks can't
  be called inside a class boundary) supplying i18n'd fallback copy. **Placement matters**:
  it must render *inside* `LangProvider` (it calls `useLang()`), not directly below
  `QueryClientProvider` as the original plan sketch said — wraps just `AuthGate` /
  `StoreProvider` / `ResponsiveApp`, not the provider setup itself.
- New i18n keys: `error.badRequest`, `error.server`, `error.boundary.title`,
  `error.boundary.reload`. Also a new exported `translate(key, vars?)` in `i18n.tsx` that
  reads language from `localStorage` directly — needed because `MutationCache.onError`
  runs outside the React tree, where `useLang()`'s context doesn't exist.
- **Real slip caught during Phase 3 staging**: `ErrorBoundary.tsx` was described in this
  phase's commit message but never actually `git add`ed — stayed untracked the whole time.
  Caught while staging Phase 3 (`git status` showed it still untracked one phase later).
  Fixed by switching back to the Phase 2 branch, committing it there (new commit, not
  amend — nothing was pushed yet so this was safe), then moving Phase 3's branch pointer
  onto the corrected Phase 2 tip via `git reset --mixed` (preserves uncommitted work). The
  file briefly got deleted from disk by the intermediate branch checkout (tracked-on-one-
  branch, absent-on-another) — recovered via `git show <commit>:<path>`, not a real loss.
  **Lesson**: after describing a new file's purpose in a commit message, verify it's
  actually in `git show --stat` for that commit, not just present in the working tree.
- Gate: `tsc` clean, 34/34 tests. Toast/boundary manual browser check **not run** (no
  browser tool this session) — dev server smoke-checked instead.

### Phase 3 — FE Forms: Inline Errors + Retained Input: done

- All 19 `store.tsx` mutation callbacks converted from fire-and-forget `.mutate()` to
  `async` + `await xMutation.mutateAsync(...)`, rethrowing on failure (no local catch —
  `MutationCache.onError` already handles the toast). `StoreValue`'s callback signatures
  all changed to `=> Promise<void>`.
- New shared `shared/hooks/useFormSubmit.ts` (extracted, not duplicated 5×): wraps an
  async `onSubmit`, exposes `{ submit, isSubmitting, errorMessage }`, using `isClientError`
  to pick `error.badRequest`/`error.server` copy. New `shared/components/FormErrorBanner.tsx`
  for the shared banner UI.
- All 5 forms (`TransactionForm`, `CategoryForm`, `BudgetForm`, `AccountForm`,
  `SubscriptionForm`) wired through `useFormSubmit`. `CategoryForm` has two independent
  mutations (save/delete) — two separate `useFormSubmit` calls, banner shows whichever
  failed most recently.
- **The actual behavior-changing part**: every screen-level caller of these forms
  (`CategoriesPage`, `Mobile/DesktopBudgets`, `Mobile/DesktopAccounts`,
  `Mobile/DesktopSubscriptions`, `Mobile/DesktopApp`) previously closed the
  form/sheet/drawer unconditionally right after firing `.mutate()` — success and failure
  looked identical. Now each caller `await`s the store call and only closes on success.
  Without this, `useFormSubmit`'s error state would never be visible (the form would
  already be closed by the time the rejection surfaced).
- Gate: `tsc` clean, 39/39 tests (4 new `useFormSubmit` cases + 1 new integration test in
  `TransactionForm.test.tsx` proving the real component tree — not just the hook in
  isolation — stays open with a banner and retained input on a rejected `onSubmit`).
  Existing `TransactionForm.test.tsx` mocks had to change from bare `vi.fn()` to
  `vi.fn().mockResolvedValue(undefined)` — the old mocks returned `undefined`, and
  `useFormSubmit`'s `.catch()` chain threw on a non-Promise return. TypeScript didn't catch
  this (a `Promise<void>`-returning prop silently accepts a `void`-returning mock
  structurally) — only running the suite surfaced it. Per-form manual browser check **not
  run** (no browser tool) — 1 of 5 forms has a real-component-tree test, the other 4 share
  identical wiring but aren't individually browser-verified.

**All 3 phases done. Nothing pushed yet.**

## Remaining Work

1. Push `error-handling/phase-1-be-error-mapping`, `phase-2-fe-error-infra`,
   `phase-3-fe-forms-inline-errors` — not done, needs explicit go-ahead.
2. `develop` isn't pushed to `origin` by this session either.
3. Bun→Node migration's broken dev-watch script (`packages/api/package.json`) — flagged,
   not fixed.
4. `gh` account mismatch still blocks PR creation (`daoduong-saritasa` can't see
   `daodd1511/expense-management`) — unresolved, longstanding.
5. GitHub default-branch flip to `develop` — requires the correct `gh` account or the
   GitHub web UI.
6. Real browser verification owed across both specs — installability panel, offline
   throttle test, toast/boundary visual check, per-form manual failure check. No browser
   automation tool available at any point this session.
7. `deleteTransactions` (bulk) in `store.tsx` still loops individual `deleteTx.mutateAsync`
   calls rather than using the existing-but-unused `useDeleteTransactions` bulk-endpoint
   hook — noticed during Phase 3, left as-is (behavior-preserving, out of scope for an
   error-handling spec to also change which endpoint gets called).

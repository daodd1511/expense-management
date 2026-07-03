# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server (Vite, http://localhost:5173)
pnpm build        # tsc -b && vite build → dist/
pnpm preview      # serve dist/ locally
pnpm exec tsc --noEmit  # type-check only
```

No test suite exists yet. No linter configured beyond TypeScript strict mode.

## Stack

- **Vite + React 19 + TypeScript** — static SPA, no SSR, no server routes
- **Tailwind v4** via `@tailwindcss/vite` plugin (no `postcss.config`)
- **shadcn/base-ui** (`@base-ui/react`) — base primitives; custom UI wrappers in `components/ui/`
- **Recharts** for charts
- **vite-plugin-pwa** — installable PWA, online-only (no offline write queue)
- **Package manager: pnpm**

## Architecture

### Two distinct layouts — not responsive scaling

`components/responsive-app.tsx` gates at 1024px: below → `MobileApp`, above → `DesktopApp`. Both are purpose-built, not stretched from one component.

- **Mobile** (`components/mobile/`): bottom tab nav (5 slots + center FAB), bottom sheets for forms, thumb-first layout
- **Desktop** (`components/desktop/`): persistent left sidebar, drawer for forms, dense data tables

Nav is tab/screen state, not URL routing. No react-router.

### State — in-memory React Context

`lib/store.tsx` exports `StoreProvider` + `useStore()`. All state is seeded from `lib/data.ts` and resets on refresh (Phase 1 = localStorage not yet wired; Phase 2 = Supabase).

Key derived selectors exported from `lib/store.tsx`: `monthSummary`, `expenseByCategory`, `spentForCategory`.

`lib/derive.ts` — chart-specific derived data (`buildDonutData`).

### Data model

```
Transaction  { id, type, amount, categoryId, accountId, toAccountId?, merchant, note?, date, receipt?, subscriptionId? }
Account      { id, name, kind, balance }
Category     { id, name, icon, color }
Budget       { categoryId, limit }
Subscription { id, name, amount, type, categoryId, accountId, cadence, dayOfMonth, monthOfYear, nextDueDate, note?, active }
```

Amount is VND integer. `balance` on Account is static (opening balance); computed balance = `opening + Σincome − Σexpense ± transfers` — not yet implemented (Phase 1 item). `subscriptionId` on Transaction links logged payments back to their Subscription for double-log detection.

### i18n

`lib/i18n.tsx` — custom flat-key system, vi default / en secondary. Add keys to both `VI` and `EN` objects; `TranslationKey` is inferred from `VI` so TypeScript enforces parity. Access via `useLang()` → `t('key', { vars })`.

### Theme

`components/theme-provider.tsx` — custom provider (no next-themes). Stores `'light' | 'dark' | 'system'` in localStorage, toggles `.dark` class on `<html>`. `useTheme()` exposes `{ theme, resolvedTheme, setTheme }`.

### Subscriptions feature

`lib/subscriptions.ts` — pure helpers: `isDue`, `isDueSoon`, `dueBanner`, `monthlyEquivalent`, `totalMonthlyCost`, `buildNextDueDate`.

Due banner appears on home screen when `nextDueDate <= today` and no same-cycle transaction with matching `subscriptionId` exists. One-tap log calls `store.logSubscription(id)` which creates a Transaction and advances `nextDueDate` atomically.

Mobile: "Kế hoạch" (Planning) tab replaces the Budgets tab; inner tab bar switches between Ngân sách and Đăng ký. Desktop: "Đăng ký" sidebar item after Budgets.

### Formatting

`lib/format.ts` — `formatVND(n)` → `"100.000 ₫"`, `formatSigned`, `amountColorClass`, date helpers. Always use these; never call `Intl` directly.

### CSS tokens

Design system lives in `app/globals.css`. Semantic color tokens: `--income`, `--expense`, `--transfer` (and `-foreground`, `-muted` variants). Motion tokens: `--duration-fast/base/slow`, `--ease-out`, `--ease-in-out`. Z-index scale: `--z-dropdown` through `--z-tooltip`. OKLCH color space throughout.

### Commit Messages
- The `terse-commit` skill generates messages matching this convention (plain
  imperative subject, no Conventional Commits prefix).

## Spec-Driven Execution Workflow

Large/architectural changes flow: `/grill-me` → `specs/<feature>/PLAN.md` →
`specs/<feature>/EXECUTION.md` (via the `spec-plan` skill) → phased implementation (via the
`spec-phase` skill). These rules bind even when neither skill is invoked. Design rationale:
`specs/spec-workflow-v2/PLAN.md`.

### State model
- **Git is the authoritative state store**: branch name encodes spec+phase
  (`<feature-slug>/phase-<n>-<desc>`), commits encode progress. Each `EXECUTION.md` opens
  with a **STATUS block** (current phase, per-phase state, verification debt) — the only
  prose trusted as state. **On any conflict, git wins silently** for mechanical facts
  (branch, commits, merged-or-not); STATUS is trusted only for what git can't express
  (debt, park reasons). `HANDOFF.md` is a session baton from `/handoff` — advisory context,
  never authority; do not resume from it.
- Phase states: `pending` / `in-progress` / `done` / `done-with-debt`. Gate items are
  `[ ]`/`[x]`; an item may be `[~]` (deferred) only when environment-blocked (missing
  tool/credentials, not effort), with substitute evidence inline and a mirrored STATUS debt
  entry. A phase is in-progress iff it has unchecked **non-deferred** items.

### Branch model — sequential, no stacking
- Each phase branches off the **integration branch** (currently `develop`; resolve at plan
  time, never hardcode) → push → PR to it → user reviews & merges → pull → next phase.
- Stacking is opt-in only: if the user explicitly says to continue while a PR awaits
  review, the next phase stacks on the unmerged branch and rebases after merge.
- After a phase's PR merges, ask before deleting the merged phase branch (local + remote).

### Checkpoints
- Starting a phase authorizes its commits — nothing else.
- Gate pass → one ask: "push + open PR?". Remote actions are never bundled with anything
  else (see Hard Stops below).
- A phase is complete only when its **agent gate** (typecheck, tests, build) actually
  passed — checking boxes doesn't substitute for running it. Manual verification scenarios
  are the **review checklist**, listed in the PR description for the user to walk through
  before merging — they are the user's, not agent debt.
- **One spec in flight at a time.** Do not start or resume a different spec's phase while
  another has an unfinished phase. Finish the current phase, or explicitly **park** it with
  the user's go-ahead: a `WIP: parked <date>` commit on the phase branch plus a STATUS note
  (never `git stash` — stashes are invisible to a cold agent and easy to orphan).

Procedure lives in the skills — planning in `.claude/skills/spec-plan/SKILL.md`, execution
and resume in `.claude/skills/spec-phase/SKILL.md` — invoke the relevant one rather than
re-deriving it.

## Coding Standards
- Always use `react-frontend-developer` skill for frontend code generation.
### Reuse First
- Prefer existing components, hooks, utilities, and models before creating new ones.
- Before creating a new component, check both [src/components](src/components) and the relevant feature module for a compatible pattern.
- Create new shared components only when reuse is likely across multiple screens/features.
- If a new component is required, keep it small, composable, and aligned with existing naming and folder conventions.

### TypeScript Strictness
- Keep TypeScript strict. Prefer precise types, discriminated unions, and generics over broad fallback types.
- Avoid `any`. If unavoidable, limit scope to the smallest boundary and include a short justification comment with a follow-up improvement note.
- Prefer `unknown` plus narrowing over `any` when handling untyped data.
- Do not silence type errors with unsafe assertions unless there is no practical typed alternative.

### Documentation Expectations
- Add concise documentation for exported functions, exported types/interfaces, and exported constants when behavior is not obvious.
- At minimum, document purpose, inputs, output/return value, and important side effects or constraints.
- Keep documentation accurate when behavior changes; update or remove stale comments in the same change.
- For complex business rules, link to canonical docs instead of duplicating long explanations.

## Execution Safety Rules

### Anti-Hallucination

- Never claim to have run, tested, built, or verified something unless it actually happened.
- Do not invent files, symbols, endpoints, configs, env vars, logs, or results.
- Separate confirmed facts from assumptions and open questions.
- If missing context can change behavior or scope, stop and ask.
- When reporting outcomes, explicitly distinguish: completed actions, not-run checks, and blockers.

### Hard Stops (Require Explicit User Confirmation)

Stop and ask in the current message before:
- Destructive or irreversible actions.
- Bulk edits/mass renames that are hard to review or revert.
- Schema or migration changes.
- Authentication, authorization, payment, CI/CD, infra, or production-sensitive config changes.
- Deploy, release, push, merge, or other external side effects.

### Uncertainty Handling

- If confidence is low and the decision materially affects behavior, scope, risk, or verification, ask before implementing.
- State what is missing to raise confidence.
- Prefer a short clarification question over a risky assumption.

### Security and Privacy

- Never hardcode secrets, tokens, passwords, or credentials.
- Never place sensitive client or personal data in source, logs, tests, comments, or docs.
- Use synthetic/mock data in tests and examples.
- If sensitive data is exposed, stop, remove it from changes, and report it.
- Redact sensitive values in examples and command output summaries.
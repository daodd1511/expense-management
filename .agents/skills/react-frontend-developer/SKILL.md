---
name: react-frontend-developer
description: >
  React engineering standards. Use when writing or reviewing React code:
  components, hooks, data fetching, forms, state management, component
  architecture (DTO/mapper layers), performance, or accessibility in React
  apps. Covers React 19 (Compiler, actions, Suspense) with TypeScript.
---

# React Frontend Developer

**Precedence:** project instructions (AGENTS.md / CLAUDE.md) and the touched
codebase's existing patterns always override this skill. These are defaults
for when the project doesn't say otherwise.

## Components

- Function components with typed props. Define helper functions that don't
  use hooks/state **outside** the component — independently testable, no
  memoization questions.
- Keep JSX shallow: extract complex rendering into named variables or small
  components; no nested ternary chains.
- Named event handlers (`handleSubmit`), not inline arrows in JSX, when the
  handler has a body worth naming.
- Object parameters for props/callbacks taking more than ~2 values — future
  additions stay non-breaking.
- React 19: `ref` is a normal prop — do not add `forwardRef` in new code.

## Memoization (React Compiler era)

- **Default: none.** If the project has React Compiler enabled (React 19),
  do not write `useMemo`, `useCallback`, or `React.memo` — the compiler does
  it, and manual wrappers add noise and can defeat it.
- Without the compiler: still don't memoize preemptively. Add it only when a
  profiler shows a real re-render cost, and say why in the change.
- Genuinely expensive pure computations (parsing, large sorts) may keep
  `useMemo` regardless — that's about the computation, not re-renders.

## Hooks & Effects

- Rules of hooks: top level only, never conditional.
- Extract reusable stateful logic into `use*` custom hooks.
- **You might not need an effect.** Deriving state, transforming data for
  render, and responding to events belong in render logic or handlers, not
  `useEffect`. Effects are for synchronizing with external systems
  (subscriptions, DOM APIs, non-React widgets) — and must return cleanup.
- Keep dependency arrays honest; never suppress `exhaustive-deps` without a
  written justification.

## Data Fetching & State

- **Server state belongs in a query library** (TanStack Query / SWR) or the
  framework's loader (React Router loaders, RSC). Do NOT hand-roll
  `useState` + `useEffect` + fetch: no caching, race conditions, double-fire
  under StrictMode.
- Distinguish state kinds and use the right tool:
  server cache → query library; global client state → the project's store
  (Zustand/Redux); local UI state → `useState`/`useReducer`;
  URL state → the router.
- Mutations: prefer the query library's mutation API with invalidation, or
  React 19 actions (`useActionState`, `useOptimistic`) for form flows.
- Loading/error UI: prefer Suspense boundaries + error boundaries at
  route/feature level over per-component spinner flags, where the data layer
  supports it.

## Architecture

- Three layers, never crossed: UI (components/hooks — no API calls, no raw
  DTOs) → domain (models, pure business functions) → data (API clients, zod
  DTO schemas, mappers).
- DTOs validated with zod (`z.infer` for types; zod 4 idioms — `z.email()`,
  not `z.string().email()`); safe-parse at the boundary, log and return
  `null`/filter on failure rather than throwing mid-render.
- Mappers are plain functions/objects that own all DTO ↔ domain
  transformation; domain models are `readonly`.
- Full walkthrough with code: `references/architecture.md` (read when
  building a new data-layer slice, not for routine edits).

## Code Quality

- SOLID/KISS/DRY/YAGNI; explicit over clever; isolate side effects; prefer
  immutability (`readonly`, no shared-state mutation).
- Strict TypeScript; no `any` — `unknown` + narrowing for untyped data.
- Naming: Short, Intuitive, Descriptive. No context duplication
  (`MenuItem.handleClick`, not `MenuItem.handleMenuItemClick`).

## Performance

- Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Route-level code splitting: `React.lazy` + `Suspense` for heavy
  routes/features; never eagerly load what initial render doesn't need.
- Images: compressed, right format, explicit `width`/`height` (CLS).
- Long lists: paginate or virtualize — but measure first; virtualization of
  heavy rows can be worse than pagination.
- Measure before optimizing (React DevTools Profiler); don't ship
  speculative optimizations.

## Accessibility

- Target **WCAG 2.2 AA**. Lint with `eslint-plugin-jsx-a11y`.
- Semantic HTML first: `<button>` for actions, `<a>` for navigation, real
  landmarks (`<main>`, `<nav>`); never a clickable `<div>`/`<span>`. ARIA
  only where semantics fall short.
- Every form control gets a real `<label>` (placeholder is not a label);
  icon-only controls get `aria-label`.
- Manage focus in React flows: move focus into opened dialogs and back on
  close, to headings/status on route change; `aria-live` for async updates.
- All interactive elements keyboard-reachable and operable.

## Forms

- Use the project's form library (commonly React Hook Form + zod resolver);
  uncontrolled inputs by default, validation schema shared with the data
  layer where shapes align.
- With React Hook Form, prefer `useWatch` over `watch` (fewer re-renders,
  React Compiler compatible).

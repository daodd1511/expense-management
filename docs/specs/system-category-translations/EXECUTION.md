# System Category Translations — Execution Plan

Spec: [PLAN.md](PLAN.md). Rulebook: `CLAUDE.md` → "Spec-Driven Execution Workflow".
Integration branch: `develop`. Branch model: stacked (default).

## STATUS

- Current phase: 1 — done-with-debt
- Phase 1 — schema, shared contract, api: done-with-debt
- Phase 2 — frontend data layer: pending
- Verification debt: `packages/shared/src/database.types.ts` `category_translations`
  type was hand-added (no local Supabase CLI); regenerate with `supabase gen types`
  once available to confirm it matches exactly.

## Phase 1 — schema, shared contract, api

Branch: `system-category-translations/phase-1-schema-api` (off `develop`)

Nothing downstream (frontend fetch/query wiring) can be verified until the table,
shared locale schema, and `GET /categories?locale=` contract exist.

- [x] `supabase/migrations/20260710120000_category_translations.sql` — create
      `category_translations` (`category_id`, `locale`, `name`), unique on
      `(category_id, locale)`, `category_id references categories(id) on delete
      cascade`; seed `vi` rows for every existing system category name (all 65
      non-"Balance Adjustment" system categories via a `case name` match, plus
      the two `Balance Adjustment` rows handled separately since that name
      isn't unique).
- [x] ~~add a supported-locale Zod schema/enum for `vi | en`~~ — not needed;
      `langSchema`/`Lang` (`z.enum(['vi', 'en'])`) already exists in
      `packages/shared/src/models/common.model.ts` and is exported from
      `@wallet/shared`. Reuse it directly in the api locale validation instead
      (amended 2026-07-10).
- [~] `packages/shared/src/database.types.ts` — add the `category_translations`
      table type. `supabase` CLI is not installed in this environment (`which
      supabase` → not found), so the type was hand-added matching the
      migration's columns (`id`, `category_id`, `locale`, `name`) rather than
      generated. Substitute evidence: hand-added shape mirrors the migration
      1:1; regenerate via `supabase gen types` once the CLI is available to
      confirm exact match.
- [x] ~~extend `category.dto.ts`/`category.mapper.ts` for localized name~~ —
      not needed; the repository resolves `name = translation.name ??
      categories.name` into the plain row object *before* it's validated by
      `categoryRowSchema`/`toCategory`, so `Category.name` flows through
      unmodified with no `canonicalName` field (amended 2026-07-10).
- [x] `packages/api/src/features/categories/schema.ts` — added
      `categoryListQuerySchema` (`{ locale: langSchema.optional() }`), reusing
      `langSchema` from `@wallet/shared` (amended: replaces the shared-dto
      item above).
- [x] `packages/api/src/features/categories/routes.ts` — validate
      `?locale=vi|en` on the `GET /categories` route via
      `zValidator('query', categoryListQuerySchema)`; invalid values return
      400 through `jsonError`.
- [x] `packages/api/src/features/categories/controller.ts` (`listCategories`)
      — now takes `(userId, locale?)` directly (matching the existing
      `createCategory` pattern) instead of a `Context`; routes.ts unwraps the
      validated query and calls it.
- [x] `packages/api/src/features/categories/service.ts` (`listCategories`) —
      threads `locale?: Lang` through to the repository.
- [x] `packages/api/src/features/categories/repository.ts` (`listCategories`)
      — added `DEFAULT_LOCALE = 'vi'`; for system categories (`owner_id is
      null`), embeds `category_translations(name, locale)` filtered to the
      requested locale and returns `name = translation.name ?? categories.name`;
      custom categories always return the stored `categories.name` unchanged.

**Agent gate (hard):**
- [x] `pnpm --filter @wallet/api typecheck` — passed, no errors
- [x] `pnpm --filter @wallet/api test` (33 passed) and
      `pnpm --filter @wallet/shared test` (31 passed)

**Review checklist (user, at PR review):**
- [ ] `GET /categories?locale=vi` returns Vietnamese names for system
      categories, unchanged names for custom categories
- [ ] `GET /categories?locale=en` returns canonical English names
- [ ] A system category missing a `vi` row falls back to `categories.name`
- [ ] An invalid `locale` value returns 400, not a silent fallback
- [ ] Existing category IDs and all transaction/budget/favorite/subscription
      references still resolve after the migration

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

## Phase 2 — frontend data layer

Branch: `system-category-translations/phase-2-fe-data` (off
`system-category-translations/phase-1-schema-api`, stacked)

Depends on the `?locale=` contract landing in Phase 1; wires the existing
category cache to request and key on the app's current language, per PLAN.md
→ "Scope of Work" #4. No UI changes — existing consumers already render
`category.name`.

- [ ] `packages/web/src/features/categories/db.ts` (`fetchCategories`) — accept
      a `locale` param and request `/categories?locale=<locale>`.
- [ ] `packages/web/src/features/categories/queries.ts` (`useCategories`) —
      read `lang` from `useLang()` (`packages/web/src/core/i18n.tsx`), include
      it in the query key (currently `['categories', user?.id]` →
      `['categories', user?.id, lang]`), and pass it to `fetchCategories`.

**Agent gate (hard):**
- [ ] `pnpm --filter @wallet/web typecheck`
- [ ] `pnpm --filter @wallet/web test` (or scope further to
      `packages/web/src/features/categories/**/*.test.ts*` if such tests
      exist)

**Review checklist (user, at PR review):**
- [ ] Switching language in Settings refetches categories and updates
      displayed names without a manual reload
- [ ] Category pickers, transaction forms, subscription forms, budgets,
      dashboard, and reports all show localized system category names after
      the switch
- [ ] Custom category names remain exactly as entered across a language
      switch

**On completion:** run agent gate, update STATUS + checkboxes, stop and ask before
push/PR. Review checklist goes into the PR description.

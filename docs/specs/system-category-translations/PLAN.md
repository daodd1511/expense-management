# System Category Translations — Plan

Produced via /grill-me interview with /grill-with-docs follow-up. All decisions
below were explicitly confirmed; do not reinterpret or expand scope during
implementation.

## Problem

System categories are seeded with English names and shared by every user. The
app already supports Vietnamese and English UI language switching, but category
labels remain English because category names come from database rows instead of
the app translation dictionary.

The current workaround would be adding frontend translation keys for every
default category, but that spreads category vocabulary into the web client and
does not scale cleanly when future clients or languages are added.

## Goals

- Show localized names for system categories in the current app language.
- Keep user-created custom category names unchanged.
- Make future language additions additive by storing category translations in a
  dedicated table.
- Ensure changing language in Settings refetches categories with the matching
  locale.
- Preserve existing category IDs and all existing transaction, budget,
  favorite, and subscription references.

## Non-Goals

- No translation for custom/user-owned categories.
- No category translation editing UI.
- No report API shape changes.
- No reseeding or deleting existing categories.
- No fallback search against canonical English names in localized UI.
- No public browser-facing Supabase access to category translation rows.

## Product Decisions

- **System-only translation**: only system categories (`owner_id is null`) get
  translated display names. Custom categories keep their literal stored `name`.
- **Separate translation table**: create `category_translations` with
  `category_id`, `locale`, and `name`, unique on `(category_id, locale)`, with
  `category_id` cascading on delete.
- **Canonical fallback**: keep `categories.name` as the canonical English label
  and fallback. Do not add English translation rows in v1.
- **Localized response field**: API responses keep returning `Category.name`.
  For system categories, that field is localized to the requested locale when a
  translation exists; otherwise it falls back to `categories.name`.
- **No `canonicalName` field**: do not expose both canonical and localized names
  in the app model. Visible consumers should render one clear `name`.
- **Locale selection**: `GET /categories?locale=vi|en` chooses the category
  display language. Use an explicit query parameter rather than
  `Accept-Language` because the app already has an in-app language setting.
- **Supported locales only**: API validation accepts only currently supported
  app locales, `vi` and `en`. Future app languages can expand this enum and seed
  translations.
- **Fallback chain**: requested translation row first, then `categories.name`.
  Do not fallback through another translation locale.
- **Complete Vietnamese seed**: seed `vi` translations for every existing system
  category in the migration. Enforce uniqueness in the database, but not
  language completeness.
- **Client cache separation**: `useCategories()` must include `lang` in its
  TanStack Query key and request `/categories?locale=<lang>`, so changing
  Settings language refetches and caches the correct category names.
- **Reports/dashboard stay ID-based**: reports and dashboards continue resolving
  category labels through `useCategoryLookup()`. Once categories are localized,
  those surfaces inherit localized labels.
- **Search/filter language**: UI category search/filtering should operate on
  displayed localized names only.
- **No RLS expansion**: category translations are read through the server API,
  which uses the service-role Supabase client. Do not add browser-facing RLS
  policies in this feature.

## Scope of Work

1. **`supabase/migrations/`**:
   - Create `category_translations`.
   - Add unique `(category_id, locale)`.
   - Add `category_id references categories(id) on delete cascade`.
   - Seed Vietnamese rows for all existing system category names from the
     current taxonomy.
   - Preserve all existing category IDs and relationships.
2. **`packages/shared` locale/category contract**:
   - Add or reuse a shared supported-locale schema for `vi | en`.
   - Keep `Category.name` as the display name.
   - Add row/DTO support for category rows returned with localized names if the
     API uses a projected query shape.
   - Update database types for `category_translations`.
3. **`packages/api` category listing**:
   - Validate `GET /categories?locale=vi|en`, defaulting to the app default
     locale if omitted.
   - Update category repository/service/controller flow to pass the requested
     locale into `listCategories`.
   - For system categories, join/select translation for the requested locale and
     return `name = translation.name ?? categories.name`.
   - For custom categories, always return the stored `categories.name`.
   - Keep create/update/delete system-category rules unchanged.
4. **`packages/web` category fetching**:
   - Update `fetchCategories(locale)` to request
     `/categories?locale=<locale>`.
   - Update `useCategories()` to read `lang` from `useLang()`, include it in
     `queryKey`, and pass it to `fetchCategories`.
   - Ensure Settings language changes trigger category refetch through the query
     key change.
   - Keep all category display consumers rendering `category.name`.

## Verification

- `GET /categories?locale=vi` returns Vietnamese names for system categories and
  original names for custom categories.
- `GET /categories?locale=en` returns canonical English names.
- Missing Vietnamese translation rows fall back to `categories.name`.
- Invalid locale query values return a 400 rather than silently falling back.
- Changing language in Settings causes the frontend to request
  `/categories?locale=<new-lang>`.
- Category pickers, transaction forms, subscription forms, budgets, dashboard,
  and reports display localized system category names through the shared category
  cache.
- Custom category names remain exactly as the user entered them across language
  changes.
- Existing transaction, budget, favorite, and subscription references remain
  valid because category IDs are preserved.

## Open Items

- None.

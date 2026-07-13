# Category Redesign Plan

Produced via `/grill-me` interview. All decisions below were explicitly confirmed; do not
reinterpret or expand scope without re-confirming.

## Motivation

Two problems in the current model (`packages/shared/src/models/category.model.ts`,
`packages/api/src/routes/categories.ts`):

1. No `type` field on categories. The FE fakes type-filtering with a hardcoded array in
   `TransactionForm.tsx:23` (`const INCOME_CATS = ['salary', 'other-income']`) — fragile,
   unenforced server-side, breaks for any custom category.
2. No hierarchy. All categories are flat.
3. Standing bug: PATCH/DELETE on system categories (`owner_id = null`) filter by
   `.eq('owner_id', userId)`, which never matches a null-owner row, producing a misleading
   `404 "Category not found"` instead of a correct permission error.

---

## Decisions

| Decision                                   | Choice                                                                                                                    | Reason                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type` values                              | `'expense' \| 'income'` only, no `transfer`                                                                               | Transfers never carry a category today (`TransactionForm.tsx:80` hardcodes `categoryId: null` for transfers)                                     |
| `type` per category                        | Exactly one, not a set                                                                                                    | Matches the motivating case (Wage ≠ expense); avoids reopening the ambiguity being fixed                                                         |
| `type` mutability                          | Immutable after creation                                                                                                  | Flipping type would instantly orphan existing transactions against the new type-match constraint                                                 |
| Hierarchy depth                            | Exactly 2 levels (parent + leaf)                                                                                          | Real taxonomies don't need deeper nesting; keeps rollup queries non-recursive                                                                    |
| Child type                                 | Inherited from parent, enforced, not independently settable                                                               | Mixed-type branches break rollups and are confusing UX                                                                                           |
| Structural cap under mutation              | A row with `parent_id != null` can never itself be a `parent_id` target; a row with children can never gain a `parent_id` | Keeps the 2-level cap true after re-parenting, not just at creation                                                                              |
| Re-parenting                               | Allowed, target parent must have same `type`                                                                              | User explicitly wants rename/re-parent without losing transaction history (already FK'd, not denormalized)                                       |
| Transaction/budget/subscription → category | May reference parent OR leaf                                                                                              | Forcing leaf-only requires a synthetic "Other" leaf under every parent                                                                           |
| Budgets across levels                      | Settable at leaf OR parent-direct only — never independently at both in the same branch                                   | Avoids an undefined "what does over-budget mean" when both levels have separate limits                                                           |
| System category edit/delete                | Blocked with `403`, not `404`                                                                                             | Bug fix folded into this migration since the router is already being touched                                                                     |
| Delete parent with children                | Blocked with `409`                                                                                                        | Avoids silent cascade data loss or surprise auto-promotion of children to top-level                                                              |
| Ownership across tree                      | Unrelated to position — system parent + user-owned child is valid                                                         | This is the intended personalization path instead of copy-on-write                                                                               |
| Existing seed data                         | Hard delete + reseed, no old→new mapping                                                                                  | Confirmed: no real user data exists yet, test data only                                                                                          |
| Child icon                                 | Always inherits parent's icon, not independently settable                                                                 | Fewer icons to pick/maintain                                                                                                                     |
| Child color                                | Inherits parent's color by default, may be overridden per child                                                           | User wants ability to visually distinguish children when needed                                                                                  |
| Chart colors                               | Add `chart-6`...`chart-12` to `globals.css` (`:root` + `.dark`)                                                           | Only 5 tokens exist today; 12 expense parents in one donut chart would collide in color, a real legibility bug in `lib/derive.ts` buildDonutData |
| Category picker UI                         | Grouped-collapsible: parent header + indented children, parent itself directly selectable                                 | Same pattern mobile (bottom sheet accordion) and desktop (drawer/dropdown grouped list)                                                          |

---

## Schema Changes

```
categories
  id            (existing)
  owner_id      (existing, nullable)
  name          (existing)
  icon          (existing)
  color         (existing)
  created_at    (existing)
  type          NEW: text NOT NULL, check in ('expense','income')
  parent_id     NEW: nullable, self-FK → categories.id

Constraints (DB-level, exact mechanism — check constraint vs trigger — TBD at implementation time):
  - child.type must equal parent.type
  - parent_id target must itself have parent_id IS NULL (no 3-level nesting)
  - a category referenced as someone's parent_id cannot itself receive a parent_id
```

No changes to `transactions`, `budgets`, or `subscriptions` schemas — they already store
`category_id` as a bare FK, so re-parenting/renaming a category requires no data migration
on those tables.

---

## API Changes (`packages/api/src/routes/categories.ts`)

- `POST /categories` — require `type`; accept optional `parent_id` (validate: exists, visible
  to user, `parent_id`'s own `parent_id IS NULL`, and if provided, inherit its `type` — reject
  mismatched `type` in the request body)
- `PATCH /categories/:id`:
  - if target is system-owned (`owner_id IS NULL`) → `403`
  - allow `name`, `icon`, `color`, `parent_id` in patch body; reject `type` entirely (immutable)
  - re-parent validation: new parent must have same `type`, must not itself be a child, and
    the category being moved must not have children of its own (can't demote a parent)
- `DELETE /categories/:id`:
  - if system-owned → `403`
  - if category has children → `409`
  - existing behavior otherwise: null out `transactions.category_id` /
    `subscriptions.category_id`, delete dependent `budgets` rows, then delete

`categoryPatchToRow` / `fromCategory` mappers (`packages/shared/src/mappers/category.mapper.ts`)
need `type`/`parent_id` added; `categorySchema` (`packages/shared/src/models/category.model.ts`)
needs `type: txTypeSchema` narrowed to `expense|income` and `parentId: z.string().nullable()`.

---

## Frontend Changes

- `TransactionForm.tsx`: remove `INCOME_CATS` (line 23) and the two usages (lines 66-68, 120);
  replace with `categories.filter((c) => c.type === type)`
- Category picker (mobile bottom sheet + desktop drawer): render grouped-collapsible list —
  parent as section header (itself selectable), children indented beneath
- Budget screen: leaf-or-parent-direct selection only; UI must prevent picking a category that
  already has a budget on its parent (or vice versa) in the same branch
- `app/globals.css` (`packages/web/src/shared/styles/globals.css`): add `--chart-6`
  through `--chart-12` to both `:root` (line ~99-103) and `.dark` (line ~145-149) blocks

---

## Seed Data (replaces current 9 categories in `packages/web/src/core/data.ts` and whatever

seeds the real Supabase `categories` table)

### Expense

| Parent            | Icon             | Children                                                 |
| ----------------- | ---------------- | -------------------------------------------------------- |
| Food & Dining     | `Utensils`       | Restaurant, Coffee, Groceries, Food Delivery, C-Store    |
| Transport         | `Bus`            | Gas, Grab/Taxi, Parking, Car Maintenance, Public Transit |
| Housing           | `House`          | Rent, Repairs, Furniture                                 |
| Bills & Utilities | `ReceiptText`    | Electricity, Water, Internet, Phone, Streaming           |
| Entertainment     | `Gamepad2`       | Travel, Movies, Games, Books/Music                       |
| Dating            | `HeartHandshake` | Food                                                     |
| Health            | `HeartPulse`     | Doctor, Medicine, Health Insurance, Gym, Sports          |
| Shopping          | `ShoppingBag`    | Clothing, Electronics, Cosmetics, Household Items        |
| Education         | `GraduationCap`  | Tuition, Books/Supplies, Courses                         |
| Pet               | `Dog`            | Pet Food, Vet, Grooming                                  |
| Gifts & Charity   | `Gift`           | Gifts, Charity                                           |
| Other             | `Ellipsis`       | _(none)_                                                 |

### Income

| Parent       | Icon             | Children                        |
| ------------ | ---------------- | ------------------------------- |
| Salary       | `Briefcase`      | Base Salary, Bonus              |
| Investment   | `TrendingUp`     | Savings Interest, Dividends     |
| Business     | `Store`          | Sales Revenue, Freelance        |
| Other Income | `CircleEllipsis` | Refund, Winnings, Gift Received |

All icon names verified to exist in installed `lucide-react ^1.16.0`
(`packages/web/node_modules/lucide-react/dist/esm/icons/`). Colors: parents get one of
`chart-1`...`chart-12` each (distinct per expense parent; income parents may reuse
`chart-1`...`chart-4` since income/expense render in separate donut charts). Children default
to their parent's color, overridable per-child.

---

## Explicitly Out of Scope

- Category tagging for `transfer`-type transactions
- More than 2 levels of nesting
- Independent budgets at both parent and child level in the same branch
- Copy-on-write personalization of system categories
- Migrating old category data — this repo has no real user data yet, hard wipe + reseed only

---

## Open Items for Implementation Time

- Exact DB mechanism for the type-match / depth-cap constraints (Postgres check constraint
  vs. trigger vs. app-layer-only validation) — Supabase schema isn't version-controlled in
  this repo, no existing migration files to follow a precedent from
- Whether the real Supabase `categories` table already has rows beyond the `data.ts` seed
  that also need deleting (confirm before running the wipe)

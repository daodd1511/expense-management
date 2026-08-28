import {
  categoryPatchToRow,
  categoryRowSchema,
  fromCategory,
  toCategory,
  type Category,
  type CategoryCreate,
  type CategoryPatch,
  type Lang,
} from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { parseRows } from "../../lib/response";
import { ApiError } from "../../middleware/error";

const DEFAULT_LOCALE: Lang = "vi";

export type ParentCandidate = {
  id: string;
  type: string;
  parent_id: string | null;
  owner_id: string | null;
};

export type OwnedCategory = ParentCandidate;

function parseCategoryRow(data: unknown, message: string): Category {
  const result = categoryRowSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten());
  }

  return toCategory(result.data);
}

export async function listCategories(db: AppDb, userId: string, locale: Lang = DEFAULT_LOCALE) {
  const rows = await db
    .selectFrom("categories")
    .leftJoin("category_translations", (join) =>
      join
        .onRef("category_translations.category_id", "=", "categories.id")
        .on("category_translations.locale", "=", locale),
    )
    .selectAll("categories")
    .select("category_translations.name as translated_name")
    .where((eb) =>
      eb.or([eb("categories.owner_id", "=", userId), eb("categories.owner_id", "is", null)]),
    )
    .orderBy("categories.created_at", "asc")
    .execute();

  const localized = rows.map(({ translated_name: translatedName, ...row }) => {
    const translated = row.owner_id === null ? translatedName : undefined;
    return { ...row, name: translated ?? row.name };
  });

  return parseRows(localized, categoryRowSchema, toCategory);
}

export async function loadParentCandidate(
  db: AppDb,
  parentId: string,
  userId: string,
): Promise<ParentCandidate | null> {
  return (
    (await db
      .selectFrom("categories")
      .select(["id", "type", "parent_id", "owner_id"])
      .where("id", "=", parentId)
      .where((eb) => eb.or([eb("owner_id", "=", userId), eb("owner_id", "is", null)]))
      .executeTakeFirst()) ?? null
  );
}

export async function createCategory(db: AppDb, userId: string, category: CategoryCreate) {
  const row = await db
    .insertInto("categories")
    .values(fromCategory({ category, ownerId: userId }))
    .returningAll()
    .executeTakeFirstOrThrow();

  return parseCategoryRow(row, "Inserted category failed validation");
}

export async function loadOwnedCategory(db: AppDb, id: string): Promise<OwnedCategory | null> {
  return (
    (await db
      .selectFrom("categories")
      .select(["id", "type", "parent_id", "owner_id"])
      .where("id", "=", id)
      .executeTakeFirst()) ?? null
  );
}

export async function countChildren(db: AppDb, categoryId: string) {
  const row = await db
    .selectFrom("categories")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("parent_id", "=", categoryId)
    .executeTakeFirstOrThrow();

  return Number(row.count);
}

export async function listBudgetedCategoryIds(db: AppDb, userId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) return new Set<string>();

  const rows = await db
    .selectFrom("budgets")
    .select("category_id")
    .where("category_id", "in", categoryIds)
    .where("owner_id", "=", userId)
    .execute();

  return new Set(rows.map((budget) => budget.category_id));
}

export async function updateCategory(db: AppDb, userId: string, id: string, patch: CategoryPatch) {
  const row = await db
    .updateTable("categories")
    .set(categoryPatchToRow(patch))
    .where("id", "=", id)
    .where("owner_id", "=", userId)
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return parseCategoryRow(row, "Updated category failed validation");
}

export async function clearTransactionsCategory(db: AppDb, userId: string, categoryId: string) {
  await db
    .updateTable("transactions")
    .set({ category_id: null })
    .where("category_id", "=", categoryId)
    .where("owner_id", "=", userId)
    .execute();
}

export async function clearSubscriptionsCategory(db: AppDb, userId: string, categoryId: string) {
  await db
    .updateTable("subscriptions")
    .set({ category_id: null })
    .where("category_id", "=", categoryId)
    .where("owner_id", "=", userId)
    .execute();
}

export async function deleteBudget(db: AppDb, userId: string, categoryId: string) {
  await db
    .deleteFrom("budgets")
    .where("category_id", "=", categoryId)
    .where("owner_id", "=", userId)
    .execute();
}

export async function deleteCategory(db: AppDb, userId: string, categoryId: string) {
  const row = await db
    .deleteFrom("categories")
    .where("id", "=", categoryId)
    .where("owner_id", "=", userId)
    .returning("id")
    .executeTakeFirst();

  return Boolean(row);
}

import type { CategoryCreate, CategoryPatch, Lang } from "@wallet/shared";
import type { AppDb } from "../../db/database";
import { ApiError } from "../../middleware/error";
import * as repository from "./repository";

function assertValidParent(
  parent: repository.ParentCandidate,
  expectedType: string,
  mismatchMessage: string,
) {
  if (parent.parent_id !== null) {
    throw new ApiError(400, "parentId target is itself a child; nesting is capped at 2 levels");
  }
  if (parent.type !== expectedType) {
    throw new ApiError(400, mismatchMessage);
  }
}

export async function listCategories(db: AppDb, userId: string, locale?: Lang) {
  return repository.listCategories(db, userId, locale);
}

export async function createCategory(db: AppDb, userId: string, category: CategoryCreate) {
  if (category.parentId) {
    const parent = await repository.loadParentCandidate(db, category.parentId, userId);
    if (!parent) {
      throw new ApiError(400, "parentId does not exist");
    }
    assertValidParent(parent, category.type, "type must match parentId category type");
  }

  return repository.createCategory(db, userId, category);
}

export async function updateCategory(
  db: AppDb,
  userId: string,
  categoryId: string,
  patch: CategoryPatch,
) {
  const existing = await repository.loadOwnedCategory(db, categoryId);
  if (!existing) {
    throw new ApiError(404, "Category not found");
  }
  if (existing.owner_id === null) {
    throw new ApiError(403, "System categories cannot be edited");
  }
  if (existing.owner_id !== userId) {
    throw new ApiError(404, "Category not found");
  }

  if (patch.parentId !== undefined && patch.parentId !== null) {
    const parent = await repository.loadParentCandidate(db, patch.parentId, userId);
    if (!parent) {
      throw new ApiError(400, "parentId does not exist");
    }
    assertValidParent(parent, existing.type, "parentId target type does not match category type");

    const childCount = await repository.countChildren(db, categoryId);
    if (childCount > 0) {
      throw new ApiError(400, "category has children and cannot be re-parented");
    }

    const budgetedIds = await repository.listBudgetedCategoryIds(db, userId, [
      categoryId,
      patch.parentId,
    ]);
    if (budgetedIds.has(categoryId) && budgetedIds.has(patch.parentId)) {
      throw new ApiError(400, "both category and parentId already have budgets; remove one first");
    }
  }

  const category = await repository.updateCategory(db, userId, categoryId, patch);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return category;
}

export async function deleteCategory(db: AppDb, userId: string, categoryId: string) {
  const existing = await repository.loadOwnedCategory(db, categoryId);
  if (!existing) {
    throw new ApiError(404, "Category not found");
  }
  if (existing.owner_id === null) {
    throw new ApiError(403, "System categories cannot be deleted");
  }
  if (existing.owner_id !== userId) {
    throw new ApiError(404, "Category not found");
  }

  const childCount = await repository.countChildren(db, categoryId);
  if (childCount > 0) {
    throw new ApiError(409, "Category has children; delete or reassign them first");
  }

  await repository.clearTransactionsCategory(db, userId, categoryId);
  await repository.clearSubscriptionsCategory(db, userId, categoryId);
  await repository.deleteBudget(db, userId, categoryId);

  const deleted = await repository.deleteCategory(db, userId, categoryId);
  if (!deleted) {
    throw new ApiError(404, "Category not found");
  }
}

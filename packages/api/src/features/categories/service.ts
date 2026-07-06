import type { CategoryCreate, CategoryPatch } from '@wallet/shared'
import { ApiError } from '../../middleware/error'
import * as repository from './repository'

function assertValidParent(parent: repository.ParentCandidate, expectedType: string, mismatchMessage: string) {
  if (parent.parent_id !== null) {
    throw new ApiError(400, 'parentId target is itself a child; nesting is capped at 2 levels')
  }
  if (parent.type !== expectedType) {
    throw new ApiError(400, mismatchMessage)
  }
}

export async function listCategories(userId: string) {
  return repository.listCategories(userId)
}

export async function createCategory(userId: string, category: CategoryCreate) {
  if (category.parentId) {
    const parent = await repository.loadParentCandidate(category.parentId, userId)
    if (!parent) {
      throw new ApiError(400, 'parentId does not exist')
    }
    assertValidParent(parent, category.type, 'type must match parentId category type')
  }

  return repository.createCategory(userId, category)
}

export async function updateCategory(userId: string, categoryId: string, patch: CategoryPatch) {
  const existing = await repository.loadOwnedCategory(categoryId)
  if (!existing) {
    throw new ApiError(404, 'Category not found')
  }
  if (existing.owner_id === null) {
    throw new ApiError(403, 'System categories cannot be edited')
  }
  if (existing.owner_id !== userId) {
    throw new ApiError(404, 'Category not found')
  }

  if (patch.parentId !== undefined && patch.parentId !== null) {
    const parent = await repository.loadParentCandidate(patch.parentId, userId)
    if (!parent) {
      throw new ApiError(400, 'parentId does not exist')
    }
    assertValidParent(parent, existing.type, 'parentId target type does not match category type')

    const childCount = await repository.countChildren(categoryId)
    if (childCount > 0) {
      throw new ApiError(400, 'category has children and cannot be re-parented')
    }

    const budgetedIds = await repository.listBudgetedCategoryIds(userId, [categoryId, patch.parentId])
    if (budgetedIds.has(categoryId) && budgetedIds.has(patch.parentId)) {
      throw new ApiError(400, 'both category and parentId already have budgets; remove one first')
    }
  }

  const category = await repository.updateCategory(userId, categoryId, patch)
  if (!category) {
    throw new ApiError(404, 'Category not found')
  }

  return category
}

export async function deleteCategory(userId: string, categoryId: string) {
  const existing = await repository.loadOwnedCategory(categoryId)
  if (!existing) {
    throw new ApiError(404, 'Category not found')
  }
  if (existing.owner_id === null) {
    throw new ApiError(403, 'System categories cannot be deleted')
  }
  if (existing.owner_id !== userId) {
    throw new ApiError(404, 'Category not found')
  }

  const childCount = await repository.countChildren(categoryId)
  if (childCount > 0) {
    throw new ApiError(409, 'Category has children; delete or reassign them first')
  }

  await repository.clearTransactionsCategory(userId, categoryId)
  await repository.clearSubscriptionsCategory(userId, categoryId)
  await repository.deleteBudget(userId, categoryId)

  const deleted = await repository.deleteCategory(userId, categoryId)
  if (!deleted) {
    throw new ApiError(404, 'Category not found')
  }
}

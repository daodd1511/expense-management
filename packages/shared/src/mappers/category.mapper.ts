import type { Category } from '../models'
import type { CategoryCreate, CategoryPatch, CategoryRow } from '../dtos'

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isSystem: row.owner_id === null,
    isHidden: row.is_hidden,
    type: row.type,
    parentId: row.parent_id,
  }
}

export function fromCategory(params: {
  category: CategoryCreate
  ownerId: string
}) {
  const { category, ownerId } = params
  return {
    owner_id: ownerId,
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    parent_id: category.parentId ?? null,
  }
}

export function categoryPatchToRow(patch: CategoryPatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.icon !== undefined && { icon: patch.icon }),
    ...(patch.color !== undefined && { color: patch.color }),
    ...(patch.parentId !== undefined && { parent_id: patch.parentId }),
  }
}

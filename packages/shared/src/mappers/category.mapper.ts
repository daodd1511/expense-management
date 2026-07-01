import type { Category } from '../models'
import type { CategoryPatch, CategoryRow } from '../dtos'

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isSystem: row.owner_id === null,
  }
}

export function fromCategory(params: {
  category: Pick<Category, 'name' | 'icon' | 'color'>
  ownerId: string
}) {
  const { category, ownerId } = params
  return {
    owner_id: ownerId,
    name: category.name,
    icon: category.icon,
    color: category.color,
  }
}

export function categoryPatchToRow(patch: CategoryPatch) {
  return {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.icon !== undefined && { icon: patch.icon }),
    ...(patch.color !== undefined && { color: patch.color }),
  }
}

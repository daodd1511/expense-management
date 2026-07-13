import type { Category } from "@/core/types";

export interface CategoryGroup {
  parent: Category;
  childCategories: Category[];
}

/** Groups a flat category list into parent + indented-children pairs (2-level hierarchy). */
export function groupCategories(categories: Category[]): CategoryGroup[] {
  const parents = categories.filter((c) => c.parentId === null);
  const childrenByParentId = new Map<string, Category[]>();
  for (const c of categories) {
    if (c.parentId === null) continue;
    const siblings = childrenByParentId.get(c.parentId) ?? [];
    siblings.push(c);
    childrenByParentId.set(c.parentId, siblings);
  }
  return parents.map((parent) => ({
    parent,
    childCategories: childrenByParentId.get(parent.id) ?? [],
  }));
}

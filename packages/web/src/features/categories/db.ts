import { z } from "zod";
import type { Category, Lang } from "@/core/types";
import { apiJson } from "@/core/api";
import { categorySchema } from "@wallet/shared";

const categoriesResponseSchema = z.object({
  data: z.array(categorySchema),
});

const categoryResponseSchema = z.object({
  data: categorySchema,
});

const okResponseSchema = z.object({
  ok: z.literal(true),
});

export async function fetchCategories(locale: Lang): Promise<Category[]> {
  const response = await apiJson(`/categories?locale=${locale}`, categoriesResponseSchema);
  return response.data;
}

export async function insertCategory(
  category: Pick<Category, "name" | "icon" | "color" | "type"> &
    Partial<Pick<Category, "parentId">>,
): Promise<void> {
  await apiJson("/categories", categoryResponseSchema, {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export async function patchCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "icon" | "color" | "parentId">>,
): Promise<void> {
  await apiJson(`/categories/${id}`, categoryResponseSchema, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiJson(`/categories/${id}`, okResponseSchema, {
    method: "DELETE",
  });
}

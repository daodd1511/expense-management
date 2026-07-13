import type { Context } from "hono";
import type { Lang } from "@wallet/shared";
import { jsonError, parseRawJsonBody } from "../../lib/response";
import type { AuthEnv } from "../../middleware/auth";
import * as service from "./service";
import { categoryPatchSchema } from "./schema";

function requireId(id: string | undefined) {
  if (!id) {
    throw new Error("Missing route param: id");
  }

  return id;
}

export async function listCategories(userId: string, locale?: Lang) {
  return service.listCategories(userId, locale);
}

export async function createCategory(
  userId: string,
  input: Parameters<typeof service.createCategory>[1],
) {
  return service.createCategory(userId, input);
}

export async function updateCategory(c: Context<AuthEnv>) {
  const raw = await parseRawJsonBody(c);
  if (!raw.success) {
    return raw.response;
  }

  if (typeof raw.data === "object" && raw.data !== null && "type" in raw.data) {
    return jsonError(c, 400, "type is immutable and cannot be patched");
  }

  const parsed = categoryPatchSchema.safeParse(raw.data);
  if (!parsed.success) {
    return jsonError(c, 400, "Invalid request body", parsed.error.flatten());
  }

  const data = await service.updateCategory(
    c.get("userId"),
    requireId(c.req.param("id")),
    parsed.data,
  );
  return c.json({ data });
}

export async function deleteCategory(c: Context<AuthEnv>) {
  await service.deleteCategory(c.get("userId"), requireId(c.req.param("id")));
  return c.json({ ok: true });
}

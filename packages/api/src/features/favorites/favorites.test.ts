import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import {
  USER_A,
  USER_B,
  createTestCategory,
  jsonRequest,
  withApiTestDatabase,
} from "../../test/postgres-fixture";

vi.setConfig({ testTimeout: 30_000 });

describe.skipIf(!hasTestDatabase)("favorites API with PostgreSQL", () => {
  it("lists, creates idempotently, and removes the current User's favorite", async () => {
    await withApiTestDatabase(async (context) => {
      const category = await createTestCategory(context, USER_A, { name: "Favorite" });
      const created = await context.request(
        USER_A,
        "/api/favorites",
        jsonRequest("POST", { categoryId: category.id }),
      );
      expect(created.status).toBe(201);

      const repeated = await context.request(
        USER_A,
        "/api/favorites",
        jsonRequest("POST", { categoryId: category.id }),
      );
      expect(repeated.status).toBe(200);

      const list = await context.request(USER_A, "/api/favorites");
      await expect(list.json()).resolves.toEqual({ data: [{ categoryId: category.id }] });

      const removed = await context.request(USER_A, `/api/favorites/${category.id}`, {
        method: "DELETE",
      });
      expect(removed.status).toBe(200);
      expect(
        (await context.request(USER_A, `/api/favorites/${category.id}`, { method: "DELETE" }))
          .status,
      ).toBe(404);
    });
  });

  it("isolates favorite lists between Users", async () => {
    await withApiTestDatabase(async (context) => {
      const categoryA = await createTestCategory(context, USER_A, { name: "A" });
      const categoryB = await createTestCategory(context, USER_B, { name: "B" });
      await context.request(
        USER_A,
        "/api/favorites",
        jsonRequest("POST", { categoryId: categoryA.id }),
      );
      await context.request(
        USER_B,
        "/api/favorites",
        jsonRequest("POST", { categoryId: categoryB.id }),
      );

      const list = await context.request(USER_A, "/api/favorites");
      await expect(list.json()).resolves.toEqual({ data: [{ categoryId: categoryA.id }] });
    });
  });

  it("rejects another User's category identifier without creating a favorite", async () => {
    await withApiTestDatabase(async (context) => {
      const privateCategory = await createTestCategory(context, USER_B, { name: "Private" });

      const response = await context.request(
        USER_A,
        "/api/favorites",
        jsonRequest("POST", { categoryId: privateCategory.id }),
      );
      expect(response.status).toBe(404);

      const list = await context.request(USER_A, "/api/favorites");
      await expect(list.json()).resolves.toEqual({ data: [] });
    });
  });
});

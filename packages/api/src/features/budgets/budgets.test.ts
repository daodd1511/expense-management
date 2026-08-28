import { describe, expect, it, vi } from "vitest";
import { hasTestDatabase } from "../../db/test-helpers";
import {
  USER_A,
  createTestCategory,
  jsonRequest,
  withApiTestDatabase,
} from "../../test/postgres-fixture";

vi.setConfig({ testTimeout: 30_000 });

describe.skipIf(!hasTestDatabase)("budgets API with PostgreSQL", () => {
  it("rejects parent-tree coverage that conflicts with a budgeted child", async () => {
    await withApiTestDatabase(async (context) => {
      const parent = await createTestCategory(context, USER_A, { name: "Parent" });
      const child = await createTestCategory(context, USER_A, {
        name: "Child",
        parentId: parent.id,
      });
      const childBudget = await context.request(
        USER_A,
        "/api/budgets",
        jsonRequest("POST", { categoryId: child.id, limit: 100, scope: "self" }),
      );
      expect(childBudget.status).toBe(201);

      const conflict = await context.request(
        USER_A,
        "/api/budgets",
        jsonRequest("POST", { categoryId: parent.id, limit: 500, scope: "tree" }),
      );

      expect(conflict.status).toBe(409);
      await expect(conflict.json()).resolves.toMatchObject({ error: "Budget conflict" });
    });
  });

  it("creates compatible budgets and allows a limit-only patch", async () => {
    await withApiTestDatabase(async (context) => {
      const parent = await createTestCategory(context, USER_A, { name: "Parent" });
      const child = await createTestCategory(context, USER_A, {
        name: "Child",
        parentId: parent.id,
      });

      expect(
        (
          await context.request(
            USER_A,
            "/api/budgets",
            jsonRequest("POST", { categoryId: parent.id, limit: 500, scope: "self" }),
          )
        ).status,
      ).toBe(201);
      expect(
        (
          await context.request(
            USER_A,
            "/api/budgets",
            jsonRequest("POST", { categoryId: child.id, limit: 100, scope: "self" }),
          )
        ).status,
      ).toBe(201);

      const patched = await context.request(
        USER_A,
        `/api/budgets/${parent.id}`,
        jsonRequest("PATCH", { limit: 750 }),
      );
      expect(patched.status).toBe(200);
      await expect(patched.json()).resolves.toEqual({
        data: { categoryId: parent.id, limit: 750, scope: "self" },
      });
    });
  });

  it("rejects a scope patch that introduces a conflict without mutating the budget", async () => {
    await withApiTestDatabase(async (context) => {
      const parent = await createTestCategory(context, USER_A, { name: "Parent" });
      const child = await createTestCategory(context, USER_A, {
        name: "Child",
        parentId: parent.id,
      });
      await context.request(
        USER_A,
        "/api/budgets",
        jsonRequest("POST", { categoryId: parent.id, limit: 500, scope: "self" }),
      );
      await context.request(
        USER_A,
        "/api/budgets",
        jsonRequest("POST", { categoryId: child.id, limit: 100, scope: "self" }),
      );

      const conflict = await context.request(
        USER_A,
        `/api/budgets/${parent.id}`,
        jsonRequest("PATCH", { limit: 999, scope: "tree" }),
      );
      expect(conflict.status).toBe(409);

      const list = await context.request(USER_A, "/api/budgets");
      await expect(list.json()).resolves.toEqual({
        data: expect.arrayContaining([
          { categoryId: parent.id, limit: 500, scope: "self" },
          { categoryId: child.id, limit: 100, scope: "self" },
        ]),
      });
    });
  });
});

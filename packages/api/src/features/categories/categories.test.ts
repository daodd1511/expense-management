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

describe.skipIf(!hasTestDatabase)("categories API with PostgreSQL", () => {
  it("enforces the two-level same-type hierarchy", async () => {
    await withApiTestDatabase(async (context) => {
      const expenseParent = await createTestCategory(context, USER_A, { name: "Expense parent" });
      const incomeParent = await createTestCategory(context, USER_A, {
        name: "Income parent",
        type: "income",
      });
      const child = await createTestCategory(context, USER_A, {
        name: "Child",
        parentId: expenseParent.id,
      });

      const mismatched = await context.request(
        USER_A,
        "/api/categories",
        jsonRequest("POST", {
          name: "Mismatch",
          icon: "Circle",
          color: "chart-1",
          type: "expense",
          parentId: incomeParent.id,
        }),
      );
      expect(mismatched.status).toBe(400);

      const nested = await context.request(
        USER_A,
        "/api/categories",
        jsonRequest("POST", {
          name: "Nested",
          icon: "Circle",
          color: "chart-1",
          type: "expense",
          parentId: child.id,
        }),
      );
      expect(nested.status).toBe(400);
    });
  });

  it("prohibits System-category mutation and type patches", async () => {
    await withApiTestDatabase(async (context) => {
      const list = await context.request(USER_A, "/api/categories?locale=en");
      const body = (await list.json()) as { data: { id: string; isSystem: boolean }[] };
      const system = body.data.find((category) => category.isSystem);
      if (!system) throw new Error("System category fixture missing");

      const systemPatch = await context.request(
        USER_A,
        `/api/categories/${system.id}`,
        jsonRequest("PATCH", { name: "Changed" }),
      );
      expect(systemPatch.status).toBe(403);

      const systemDelete = await context.request(USER_A, `/api/categories/${system.id}`, {
        method: "DELETE",
      });
      expect(systemDelete.status).toBe(403);

      const owned = await createTestCategory(context, USER_A, { name: "Owned" });
      const typePatch = await context.request(
        USER_A,
        `/api/categories/${owned.id}`,
        jsonRequest("PATCH", { type: "income" }),
      );
      expect(typePatch.status).toBe(400);
    });
  });

  it("blocks conflicting re-parenting, parent deletion, and cross-User mutation", async () => {
    await withApiTestDatabase(async (context) => {
      const parent = await createTestCategory(context, USER_A, { name: "Parent" });
      const child = await createTestCategory(context, USER_A, {
        name: "Child",
        parentId: parent.id,
      });
      const otherParent = await createTestCategory(context, USER_A, { name: "Other parent" });
      await context.request(
        USER_A,
        "/api/budgets",
        jsonRequest("POST", { categoryId: child.id, limit: 100, scope: "self" }),
      );
      await context.request(
        USER_A,
        "/api/budgets",
        jsonRequest("POST", { categoryId: otherParent.id, limit: 100, scope: "self" }),
      );

      const reparent = await context.request(
        USER_A,
        `/api/categories/${child.id}`,
        jsonRequest("PATCH", { parentId: otherParent.id }),
      );
      expect(reparent.status).toBe(400);

      const deleteParent = await context.request(USER_A, `/api/categories/${parent.id}`, {
        method: "DELETE",
      });
      expect(deleteParent.status).toBe(409);

      const crossUser = await context.request(
        USER_B,
        `/api/categories/${child.id}`,
        jsonRequest("PATCH", { name: "Leaked" }),
      );
      expect(crossUser.status).toBe(404);
    });
  });
});

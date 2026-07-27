import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv } from "../../middleware/auth";
import { errorMiddleware, handleError } from "../../middleware/error";

const { listBudgets, createBudget, updateBudget } = vi.hoisted(() => ({
  listBudgets: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
}));

vi.mock("./repository", () => ({
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget: vi.fn(),
}));

const { listCategories } = vi.hoisted(() => ({
  listCategories: vi.fn(),
}));

vi.mock("../categories/service", () => ({ listCategories }));

import { budgetsRouter } from "./routes";

function buildApp() {
  const app = new Hono<AuthEnv>();
  app.use("*", errorMiddleware);
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("userId", "user-1");
    await next();
  });
  app.route("/budgets", budgetsRouter);
  return app;
}

const food = { id: "food", name: "Food", parentId: null };
const coffee = { id: "coffee", name: "Coffee", parentId: "food" };

describe("budgetsRouter", () => {
  beforeEach(() => {
    listBudgets.mockReset();
    createBudget.mockReset();
    updateBudget.mockReset();
    listCategories.mockReset();
    listCategories.mockResolvedValue([food, coffee]);
  });

  it("rejects POST when a tree budget on the parent would conflict with a budgeted child", async () => {
    listBudgets.mockResolvedValue([{ categoryId: "coffee", limit: 500_000, scope: "self" }]);

    const app = buildApp();
    const response = await app.request("/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "food", limit: 5_000_000, scope: "tree" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "Budget conflict" });
    expect(createBudget).not.toHaveBeenCalled();
  });

  it("creates the budget when its coverage does not conflict with any existing budget", async () => {
    listBudgets.mockResolvedValue([]);
    createBudget.mockResolvedValue({ categoryId: "food", limit: 5_000_000, scope: "tree" });

    const app = buildApp();
    const response = await app.request("/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "food", limit: 5_000_000, scope: "tree" }),
    });

    expect(response.status).toBe(201);
    expect(createBudget).toHaveBeenCalledWith("user-1", {
      categoryId: "food",
      limit: 5_000_000,
      scope: "tree",
    });
  });

  it("rejects PATCH that changes scope into a conflict, without mutating anything", async () => {
    listBudgets.mockResolvedValue([
      { categoryId: "food", limit: 5_000_000, scope: "self" },
      { categoryId: "coffee", limit: 500_000, scope: "self" },
    ]);

    const app = buildApp();
    const response = await app.request("/budgets/food", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 5_000_000, scope: "tree" }),
    });

    expect(response.status).toBe(409);
    expect(updateBudget).not.toHaveBeenCalled();
  });

  it("allows a limit-only PATCH while a self parent and its child budget coexist", async () => {
    updateBudget.mockResolvedValue({ categoryId: "food", limit: 6_000_000, scope: "self" });

    const app = buildApp();
    const response = await app.request("/budgets/food", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 6_000_000 }),
    });

    expect(response.status).toBe(200);
    expect(listCategories).not.toHaveBeenCalled();
    expect(updateBudget).toHaveBeenCalledWith("user-1", "food", { limit: 6_000_000 });
  });

  it("maps a unique-constraint violation from the DB to 409", async () => {
    listBudgets.mockResolvedValue([]);
    createBudget.mockRejectedValue({ code: "23505", message: "duplicate key value" });

    const app = buildApp();
    const response = await app.request("/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "food", limit: 5_000_000, scope: "tree" }),
    });

    expect(response.status).toBe(409);
  });
});

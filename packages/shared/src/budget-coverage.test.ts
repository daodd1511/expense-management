import { describe, expect, it } from "vitest";
import { budgetCoverage, conflictingBudget } from "./budget-coverage";
import type { Budget, Category } from "./models";

const food: Category = {
  id: "food",
  name: "Food",
  icon: "x",
  color: "chart-1",
  isSystem: true,
  isHidden: false,
  type: "expense",
  parentId: null,
};
const restaurant: Category = {
  id: "restaurant",
  name: "Restaurant",
  icon: "x",
  color: "chart-1",
  isSystem: true,
  isHidden: false,
  type: "expense",
  parentId: "food",
};
const coffee: Category = {
  id: "coffee",
  name: "Coffee",
  icon: "x",
  color: "chart-1",
  isSystem: true,
  isHidden: false,
  type: "expense",
  parentId: "food",
};
const categories = [food, restaurant, coffee];

function budget(categoryId: string, scope: Budget["scope"], limit = 100): Budget {
  return { categoryId, limit, scope };
}

describe("budgetCoverage", () => {
  it("covers only the category itself when scope is self", () => {
    expect(budgetCoverage(budget("food", "self"), categories)).toEqual(new Set(["food"]));
  });

  it("covers the category and its children when scope is tree", () => {
    expect(budgetCoverage(budget("food", "tree"), categories)).toEqual(
      new Set(["food", "restaurant", "coffee"]),
    );
  });

  it("covers only itself for a leaf category regardless of scope", () => {
    expect(budgetCoverage(budget("coffee", "tree"), categories)).toEqual(new Set(["coffee"]));
  });
});

describe("conflictingBudget", () => {
  it("blocks a category that already has a direct budget", () => {
    const existing = budget("food", "self");
    expect(conflictingBudget("food", "self", [existing], categories)).toBe(existing);
  });

  it("blocks a child when its parent has a tree budget", () => {
    const parentBudget = budget("food", "tree");
    expect(conflictingBudget("restaurant", "self", [parentBudget], categories)).toBe(parentBudget);
  });

  it("blocks a tree parent when a child already has a budget", () => {
    const childBudget = budget("coffee", "self");
    expect(conflictingBudget("food", "tree", [childBudget], categories)).toBe(childBudget);
  });

  it("allows a self parent and a budgeted child to coexist", () => {
    expect(conflictingBudget("restaurant", "self", [budget("food", "self")], categories)).toBe(
      null,
    );
    expect(conflictingBudget("food", "self", [budget("coffee", "self")], categories)).toBe(null);
  });

  it("allows a category with no budget conflicts in its branch", () => {
    expect(conflictingBudget("restaurant", "self", [], categories)).toBe(null);
  });

  it("excludes the budget being edited so editing does not self-block", () => {
    expect(
      conflictingBudget("food", "tree", [budget("food", "self")], categories, "food"),
    ).toBe(null);
  });

  it("treats a leaf's self and tree scope as equivalent for conflicts", () => {
    const childBudget = budget("coffee", "self");
    expect(conflictingBudget("coffee", "tree", [childBudget], categories, "coffee")).toBe(null);
  });
});

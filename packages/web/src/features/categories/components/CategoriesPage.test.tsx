import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/core/types";
import { CategoriesPage } from "./CategoriesPage";

const storeMocks = vi.hoisted(() => ({
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

function asMutation(fn: (...args: never[]) => unknown) {
  return { mutateAsync: fn };
}

const systemCategory: Category = {
  id: "system-food",
  name: "System food",
  icon: "Utensils",
  color: "chart-1",
  isSystem: true,
  isHidden: false,
  type: "expense",
  parentId: null,
};

const customCategory: Category = {
  id: "custom-coffee",
  name: "Custom coffee",
  icon: "Coffee",
  color: "chart-2",
  isSystem: false,
  isHidden: false,
  type: "expense",
  parentId: null,
};

const nestedExpenseCategory: Category = {
  id: "expense-lunch",
  name: "Lunch",
  icon: "Utensils",
  color: "chart-1",
  isSystem: false,
  isHidden: false,
  type: "expense",
  parentId: "system-food",
};

const incomeCategory: Category = {
  id: "income-job",
  name: "Job income",
  icon: "Briefcase",
  color: "chart-3",
  isSystem: true,
  isHidden: false,
  type: "income",
  parentId: null,
};

const hiddenCategory: Category = {
  id: "system-adjustment",
  name: "Balance adjustment",
  icon: "Scale",
  color: "chart-4",
  isSystem: true,
  isHidden: true,
  type: "expense",
  parentId: null,
};

vi.mock("@/features/categories/queries", () => ({
  useCategories: () => ({
    data: [systemCategory, customCategory, nestedExpenseCategory, incomeCategory, hiddenCategory],
  }),
  useAddCategory: () => asMutation(storeMocks.addCategory),
  useUpdateCategory: () => asMutation(storeMocks.updateCategory),
  useDeleteCategory: () => asMutation(storeMocks.deleteCategory),
}));

vi.mock("@/features/categories/favorites-queries", () => ({
  useFavoriteCategoryIds: () => new Set<string>(),
  useAddFavorite: () => asMutation(storeMocks.addFavorite),
  useRemoveFavorite: () => asMutation(storeMocks.removeFavorite),
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    lang: "en",
    t: (key: string, vars?: Record<string, string | number>) =>
      ({
        "settings.title": "Settings",
        "settings.categories": "Categories",
        "settings.categoriesActive": `${vars?.n} active categories`,
        "settings.add": "Add",
        "settings.addCategory": "Add category",
        "settings.editCat": "Edit category",
        "settings.newCat": "New category",
        "settings.catDesc": "Change category details",
        "settings.catType": "Category type",
        "settings.catTypeExpense": "Expense",
        "settings.catTypeIncome": "Income",
        "dashboard.expense": "Expense",
        "dashboard.income": "Income",
        "settings.parentCat": "Parent category",
        "settings.parentCatTopLevel": "Top-level category",
        "settings.catName": "Category name",
        "settings.catPlaceholder": "E.g. Coffee",
        "settings.icon": "Icon",
        "settings.iconLabel": `Choose icon ${vars?.icon}`,
        "settings.color": "Color",
        "settings.colorLabel": `Choose color ${vars?.color}`,
        "settings.saveCat": "Save category",
        "settings.createCat": "Create category",
        "form.cancel": "Cancel",
        "category.favorite": `Favorite ${vars?.name}`,
        "category.unfavorite": `Unfavorite ${vars?.name}`,
      })[key] ?? key,
  }),
}));

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters the list by type with the segmented control", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage variant="desktop" />);

    expect(screen.getByRole("button", { name: "System food" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Job income" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Income" }));

    expect(screen.getByRole("button", { name: "Job income" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "System food" })).toBeNull();
  });

  it("disables editing for system categories while custom categories remain editable", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage variant="desktop" />);

    const systemButton = screen.getByRole("button", { name: "System food" });
    expect(systemButton).toHaveProperty("disabled", true);

    await user.click(systemButton);
    expect(screen.queryByText("Edit category")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Custom coffee" }));
    expect(screen.getByText("Edit category")).toBeDefined();
  });

  it("shows hidden transaction categories without a favorite action", () => {
    render(<CategoriesPage variant="desktop" />);

    expect(screen.getByRole("button", { name: "Balance adjustment" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Favorite Balance adjustment" })).toBeNull();
  });

  it("creates a child category from the add form parent selector", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage variant="desktop" />);

    await user.click(screen.getByRole("button", { name: "Add category" }));
    const incomeParentOptions = screen
      .queryAllByRole("button", { name: "Job income" })
      .filter((button) => !(button as HTMLButtonElement).disabled);
    expect(incomeParentOptions).toHaveLength(0);

    const parentOption = screen
      .getAllByRole("button", { name: "System food" })
      .find((button) => !(button as HTMLButtonElement).disabled);

    expect(parentOption).toBeDefined();
    await user.click(parentOption as HTMLButtonElement);
    await user.type(screen.getByLabelText("Category name"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(storeMocks.addCategory).toHaveBeenCalledWith({
      name: "Lunch",
      icon: "Tag",
      color: "chart-1",
      type: "expense",
      parentId: "system-food",
    });
  });
});

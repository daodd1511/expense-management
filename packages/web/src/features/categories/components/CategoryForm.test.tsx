import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CATEGORY_ICON_OPTIONS } from "@/shared/icons";
import { CategoryForm } from "./CategoryForm";

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      ({
        "settings.editCat": "Edit category",
        "settings.newCat": "New category",
        "settings.catDesc": "Description",
        "settings.catType": "Type",
        "settings.catTypeExpense": "Expense",
        "settings.catTypeIncome": "Income",
        "settings.parentCat": "Parent",
        "settings.parentCatTopLevel": "Top level",
        "settings.catName": "Name",
        "settings.catPlaceholder": "Placeholder",
        "settings.icon": "Icon",
        "settings.color": "Color",
        "settings.saveCat": "Save",
        "settings.createCat": "Create",
        "settings.iconLabel": `icon-${vars?.icon}`,
        "settings.colorLabel": `color-${vars?.color}`,
        "form.cancel": "Cancel",
      })[key] ?? key,
  }),
}));

describe("CategoryForm", () => {
  it("renders the shared icon registry in the picker", () => {
    render(
      <CategoryForm
        categories={[]}
        onSave={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getAllByLabelText(/icon-/)).toHaveLength(CATEGORY_ICON_OPTIONS.length);
  });

  it("renders all 12 chart colors in the picker", () => {
    render(
      <CategoryForm
        categories={[]}
        onSave={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
        onCancel={vi.fn()}
      />,
    );

    const colorButtons = Array.from({ length: 12 }, (_, index) =>
      screen.getByLabelText(`color-chart-${index + 1}`),
    );

    expect(colorButtons).toHaveLength(12);
  });
});

import { useState } from "react";
import { conflictingBudget } from "@wallet/shared";
import { ApiError } from "@/core/api";
import { FavoriteCategoryPicker } from "@/features/categories/components/FavoriteCategoryPicker";
import { AmountField } from "@/shared/components/AmountField";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { FormFooterBar } from "@/shared/components/FormFooterBar";
import { SheetFormHeader } from "@/shared/components/SheetFormHeader";
import { Label } from "@/shared/components/ui/input";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { cn } from "@/shared/lib/utils";
import { useLang } from "@/core/i18n";
import { useCategories } from "@/features/categories/queries";
import { useFavoriteCategoryIds } from "@/features/categories/favorites-queries";
import { useBudgets } from "@/features/budgets/queries";
import type { Budget, BudgetScope, Category } from "@/core/types";

interface BudgetFormProps {
  initial?: Budget;
  onSubmit: (b: Budget) => Promise<void>;
  onCancel: () => void;
}

function hasChildren(categoryId: string, categories: Category[]) {
  return categories.some((c) => c.parentId === categoryId);
}

export function BudgetForm({ initial, onSubmit, onCancel }: BudgetFormProps) {
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const favoriteCategoryIds = useFavoriteCategoryIds();
  const { t } = useLang();

  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [scope, setScope] = useState<BudgetScope>(initial?.scope ?? "tree");
  const [amount, setAmount] = useState(initial ? String(initial.limit) : "");

  // Excludes exact matches and descendants of an existing `tree` budget; a parent whose
  // child is budgeted `self` stays selectable (their coverage is disjoint).
  const availableCategories = categories.filter(
    (c) =>
      !c.isHidden &&
      !conflictingBudget(c.id, "self", budgets, categories, initial?.categoryId),
  );

  const categoryHasChildren = categoryId ? hasChildren(categoryId, categories) : false;
  const blockingChildBudget =
    categoryId && categoryHasChildren
      ? conflictingBudget(categoryId, "tree", budgets, categories, initial?.categoryId)
      : null;
  const blockingChildCategory = blockingChildBudget
    ? categories.find((c) => c.id === blockingChildBudget.categoryId)
    : null;

  const effectiveScope: BudgetScope = !categoryHasChildren
    ? "tree"
    : blockingChildBudget
      ? "self"
      : scope;

  const numericAmount = Number(amount) || 0;
  const canSubmit = !!categoryId && numericAmount > 0;

  const wrappedSubmit = async (b: Budget) => {
    try {
      await onSubmit(b);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new ApiError(error.message, error.status, {
          fieldErrors: { scope: [t("budget.conflict")] },
        });
      }
      throw error;
    }
  };

  const { submit, isSubmitting, errorMessage } = useFormSubmit(wrappedSubmit);

  const handleSelectCategory = (id: string) => {
    setCategoryId(id || null);
    // A freshly picked category always starts at the default scope; `effectiveScope`
    // forces it back down to "self" below if the new category's children are budgeted.
    if (id) setScope("tree");
  };

  const handleSubmit = () => {
    if (!categoryId) return;
    submit({ categoryId, limit: numericAmount, scope: effectiveScope });
  };

  return (
    <div className="flex flex-col">
      <SheetFormHeader
        title={initial ? t("budget.edit") : t("budget.add")}
        onClose={onCancel}
        closeLabel={t("form.close")}
      />

      <AmountField label={t("budget.limit")} value={amount} onChange={setAmount} />

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Label>{t("budget.category")}</Label>
          <FavoriteCategoryPicker
            categories={availableCategories}
            favoriteCategoryIds={favoriteCategoryIds}
            selectedId={categoryId}
            onSelect={handleSelectCategory}
            disabled={!!initial}
          />
        </div>

        {categoryId && categoryHasChildren && (
          <div className="flex flex-col gap-2">
            <Label>{t("budget.scope")}</Label>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["self", "tree"] as const).map((value) => {
                const disabled = value === "tree" && !!blockingChildBudget;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={effectiveScope === value}
                    disabled={disabled}
                    onClick={() => setScope(value)}
                    className={cn(
                      "rounded-lg py-2.5 text-sm font-semibold transition-colors",
                      effectiveScope === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
                    )}
                  >
                    {value === "self" ? t("budget.scopeSelf") : t("budget.scopeTree")}
                  </button>
                );
              })}
            </div>
            {blockingChildCategory && (
              <p className="text-xs text-muted-foreground">
                {t("budget.scopeTreeBlocked", { childName: blockingChildCategory.name })}
              </p>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="px-4 pt-3 sm:px-5">
          <FormErrorBanner message={errorMessage} />
        </div>
      )}

      <FormFooterBar
        cancelLabel={t("form.cancel")}
        onCancel={onCancel}
        submitLabel={initial ? t("form.save") : t("budget.add")}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

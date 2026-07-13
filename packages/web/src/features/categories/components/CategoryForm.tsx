import { Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryIcon, colorVar } from "@/shared/components/CategoryIcon";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { FormFooterBar } from "@/shared/components/FormFooterBar";
import { Input, Label } from "@/shared/components/ui/input";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { CATEGORY_ICON_OPTIONS } from "@/shared/icons";
import { useLang } from "@/core/i18n";
import type { Category } from "@/core/types";
import { cn } from "@/shared/lib/utils";
import { isClientError } from "@/core/api";
import { translate } from "@/core/i18n";

const COLOR_OPTIONS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
  "chart-9",
  "chart-10",
  "chart-11",
  "chart-12",
] as const;

export interface CategoryFormState {
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  parentId: string | null;
}

const EMPTY_CATEGORY: CategoryFormState = {
  name: "",
  icon: "Tag",
  color: "chart-1",
  type: "expense",
  parentId: null,
};

export function toFormState(category: Category | undefined): CategoryFormState {
  if (!category) return EMPTY_CATEGORY;
  return {
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    parentId: category.parentId,
  };
}

export function CategoryForm({
  initial,
  categories,
  onSave,
  onDelete,
  onCancel,
}: {
  initial?: Category;
  categories: Category[];
  onSave: (form: CategoryFormState) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<CategoryFormState>(() => toFormState(initial));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const isEditing = !!initial;
  const hasChildren = initial
    ? categories.some((category) => category.parentId === initial.id)
    : false;
  const canChangeParent = !hasChildren;
  const parentOptions = categories.filter((category) => {
    if (category.parentId !== null) return false;
    if (initial && category.id === initial.id) return false;
    if (category.type !== form.type) return false;
    return true;
  });

  const canDelete = isEditing && !initial?.isSystem;
  const canSave = form.name.trim().length > 0;

  const {
    submit: submitSave,
    isSubmitting: isSaving,
    errorMessage: saveError,
  } = useFormSubmit(onSave);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const errorMessage = saveError ?? deleteError;

  const handleSave = () => {
    if (!canSave) return;
    submitSave({ ...form, name: form.name.trim() });
  };

  const handleConfirmDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await onDelete();
      setConfirmDeleteOpen(false);
    } catch (error: unknown) {
      setDeleteError(translate(isClientError(error) ? "error.badRequest" : "error.server"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetType = (type: CategoryFormState["type"]) => {
    setForm((prev) => ({ ...prev, type, parentId: null }));
  };

  const handleSetParent = (parent: Category | null) => {
    setForm((prev) => ({
      ...prev,
      parentId: parent?.id ?? null,
      type: parent?.type ?? prev.type,
      color: parent?.color ?? prev.color,
    }));
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-2 pb-4 sm:px-5">
        <span
          className="inline-flex size-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: colorVar(form.color) }}
        >
          <CategoryIcon name={form.icon} className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">
            {isEditing ? t("settings.editCat") : t("settings.newCat")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("settings.catDesc")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Label>{t("settings.catType")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={isEditing || form.parentId !== null}
                onClick={() => handleSetType(type)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  form.type === type ? "border-primary bg-accent" : "border-border hover:bg-muted",
                )}
              >
                {type === "expense" ? t("settings.catTypeExpense") : t("settings.catTypeIncome")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("settings.parentCat")}</Label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={!canChangeParent}
              onClick={() => handleSetParent(null)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                form.parentId === null
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-muted",
              )}
            >
              {t("settings.parentCatTopLevel")}
            </button>
            {parentOptions.map((parent) => (
              <button
                key={parent.id}
                type="button"
                disabled={!canChangeParent}
                onClick={() => handleSetParent(parent)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  form.parentId === parent.id
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted",
                )}
              >
                <span
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: colorVar(parent.color) }}
                >
                  <CategoryIcon name={parent.icon} className="size-3.5" />
                </span>
                <span className="truncate">{parent.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">{t("settings.catName")}</Label>
          <Input
            id="category-name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t("settings.catPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("settings.icon")}</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, icon }))}
                aria-label={t("settings.iconLabel", { icon })}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg border transition-colors",
                  form.icon === icon
                    ? "border-primary bg-accent text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                <CategoryIcon name={icon} className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("settings.color")}</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, color }))}
                aria-label={t("settings.colorLabel", { color })}
                className={cn(
                  "size-8 rounded-full border-2 transition-transform active:scale-95",
                  form.color === color ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: colorVar(color) }}
              />
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="px-4 pt-3 sm:px-5">
          <FormErrorBanner message={errorMessage} />
        </div>
      )}

      <FormFooterBar
        cancelLabel={t("form.cancel")}
        onCancel={onCancel}
        submitLabel={isEditing ? t("settings.saveCat") : t("settings.createCat")}
        onSubmit={handleSave}
        canSubmit={canSave}
        isSubmitting={isSaving}
        extra={
          canDelete && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 text-expense hover:bg-expense/10 hover:text-expense"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )
        }
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        confirmLoadingLabel={t("confirm.deleting")}
      />
    </div>
  );
}

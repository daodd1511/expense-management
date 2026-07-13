import { useState } from "react";
import { FavoriteCategoryPicker } from "@/features/categories/components/FavoriteCategoryPicker";
import { AmountField } from "@/shared/components/AmountField";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { FormFooterBar } from "@/shared/components/FormFooterBar";
import { SheetFormHeader } from "@/shared/components/SheetFormHeader";
import { Input, Label } from "@/shared/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useLang } from "@/core/i18n";
import { buildNextDueDate } from "@/features/subscriptions/helpers";
import { useCategories, useCategoryLookup } from "@/features/categories/queries";
import { useFavoriteCategoryIds } from "@/features/categories/favorites-queries";
import { useAccounts } from "@/features/accounts/queries";
import { AccountSelect } from "@/features/accounts/components/AccountSelect";
import type { Subscription, SubscriptionCadence } from "@/core/types";
import { cn } from "@/shared/lib/utils";

const MONTHS_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseAmount(raw: string): number {
  return Number(raw.replace(/\D/g, "")) || 0;
}

interface Props {
  initial?: Subscription;
  onSubmit: (data: Omit<Subscription, "id">) => Promise<void>;
  onCancel: () => void;
}

export function SubscriptionForm({ initial, onSubmit, onCancel }: Props) {
  const { t, lang } = useLang();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const getCategory = useCategoryLookup();
  const favoriteCategoryIds = useFavoriteCategoryIds();

  const [name, setName] = useState(initial?.name ?? "");
  const [amountRaw, setAmountRaw] = useState(initial ? String(initial.amount) : "");
  const [type, setType] = useState<"expense" | "income">(initial?.type ?? "expense");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? "");
  const [cadence, setCadence] = useState<SubscriptionCadence>(initial?.cadence ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth ?? new Date().getDate());
  const [monthOfYear, setMonthOfYear] = useState(initial?.monthOfYear ?? new Date().getMonth() + 1);
  const [note, setNote] = useState(initial?.note ?? "");
  const [active] = useState(initial?.active ?? true);

  const MONTHS = lang === "vi" ? MONTHS_VI : MONTHS_EN;
  const amount = parseAmount(amountRaw);
  const visibleCategories = categories.filter(
    (category) => category.type === type && !category.isHidden,
  );
  const canSubmit = name.trim().length > 0 && amount > 0 && !!accountId && !!categoryId;
  const amountTone = type === "income" ? "income" : "expense";

  const { submit: submitForm, isSubmitting, errorMessage } = useFormSubmit(onSubmit);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const nextDueDate = buildNextDueDate(dayOfMonth, monthOfYear, cadence);
    submitForm({
      name: name.trim(),
      amount,
      type,
      categoryId,
      accountId,
      cadence,
      dayOfMonth,
      monthOfYear,
      nextDueDate,
      note: note.trim() || undefined,
      active,
    });
  };

  return (
    <div className="flex flex-col">
      <SheetFormHeader
        title={initial ? t("sub.editTitle") : t("sub.addTitle")}
        onClose={onCancel}
        closeLabel={t("form.close")}
      />

      {/* Type toggle */}
      <div className="px-4 sm:px-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["expense", "income"] as const).map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => {
                setType(tp);
                if (getCategory(categoryId)?.type !== tp) setCategoryId(null);
              }}
              className={cn(
                "rounded-lg py-2 text-sm font-medium transition-colors",
                type === tp
                  ? tp === "expense"
                    ? "bg-expense text-expense-foreground"
                    : "bg-income text-income-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tp === "expense" ? t("form.expense") : t("form.income")}
            </button>
          ))}
        </div>
      </div>

      <AmountField
        label={t("form.amount")}
        value={amountRaw}
        onChange={setAmountRaw}
        tone={amountTone}
      />

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        {/* Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-name">{t("sub.name")}</Label>
          <Input
            id="sub-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("sub.namePlaceholder")}
          />
        </div>

        {/* Cadence */}
        <div className="flex flex-col gap-2">
          <Label>{t("sub.cadence")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                  cadence === c
                    ? "border-primary bg-accent text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {c === "monthly" ? t("sub.monthly") : t("sub.yearly")}
              </button>
            ))}
          </div>
        </div>

        {/* Day of month */}
        <div className={cn("grid gap-3", cadence === "yearly" ? "grid-cols-2" : "grid-cols-1")}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-day">{t("sub.dayOfMonth")}</Label>
            <Input
              id="sub-day"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))}
            />
          </div>
          {cadence === "yearly" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sub-month">{t("sub.monthOfYear")}</Label>
              <Select
                value={String(monthOfYear)}
                onValueChange={(nextValue) => nextValue && setMonthOfYear(Number(nextValue))}
              >
                <SelectTrigger id="sub-month">
                  <SelectValue>
                    {(selected: string | null) => MONTHS[Number(selected) - 1] ?? MONTHS[0]}
                  </SelectValue>
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner>
                    <SelectPopup>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <Label>{t("form.category")}</Label>
          <FavoriteCategoryPicker
            categories={visibleCategories}
            favoriteCategoryIds={favoriteCategoryIds}
            selectedId={categoryId}
            onSelect={(id) => setCategoryId(id || null)}
          />
        </div>

        {/* Account */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-account">{t("form.account")}</Label>
          <AccountSelect
            id="sub-account"
            value={accountId}
            onChange={setAccountId}
            accounts={accounts}
            placeholder={t("form.selectAccount")}
          />
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-note">{t("form.note")}</Label>
          <Input
            id="sub-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("form.notePlaceholder")}
          />
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
        submitLabel={initial ? t("sub.save") : t("sub.create")}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

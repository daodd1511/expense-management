import { ArrowRight, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FavoriteCategoryPicker } from "@/features/categories/components/FavoriteCategoryPicker";
import { AmountField } from "@/shared/components/AmountField";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { FormFooterBar } from "@/shared/components/FormFooterBar";
import { SheetFormHeader } from "@/shared/components/SheetFormHeader";
import { Input, Label, Textarea } from "@/shared/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useLang } from "@/core/i18n";
import { useCategories, useCategoryLookup } from "@/features/categories/queries";
import { useFavoriteCategoryIds } from "@/features/categories/favorites-queries";
import { useAccounts } from "@/features/accounts/queries";
import { AccountSelect } from "@/features/accounts/components/AccountSelect";
import type { Transaction, TxType } from "@/core/types";
import type { TransactionCreate } from "@wallet/shared";
import { cn } from "@/shared/lib/utils";

function todayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentLocalTime() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function timeParts(value: string) {
  const [hour = "", minute = ""] = value.split(":");
  return { hour, minute };
}

function clampTimePart(value: string, max: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  return String(Math.min(Number(digits), max)).padStart(2, "0");
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
// 'loan' transactions are never created through this generic form (the API rejects
// type: 'loan' here; only the Loans feature's RPCs may create them) but TxType includes
// it, so this lookup must still handle it for exhaustiveness.
const AMOUNT_TONE_BY_TYPE = {
  income: "income",
  expense: "expense",
  transfer: "neutral",
  loan: "neutral",
} as const;

function TimeWheelColumn({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollEndTimeoutRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);

  useEffect(() => {
    if (isUserScrollingRef.current) return;
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, [value]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    isUserScrollingRef.current = true;

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const scrollerCenter = scrollerRect.top + scrollerRect.height / 2;
      const optionButtons = Array.from(
        scroller.querySelectorAll<HTMLButtonElement>("[data-time-option]"),
      );
      const closestOption = optionButtons.reduce<{ value: string; distance: number } | null>(
        (closest, button) => {
          const optionValue = button.dataset.timeOption;
          if (!optionValue) return closest;

          const buttonRect = button.getBoundingClientRect();
          const buttonCenter = buttonRect.top + buttonRect.height / 2;
          const distance = Math.abs(buttonCenter - scrollerCenter);

          if (!closest || distance < closest.distance) {
            return { value: optionValue, distance };
          }

          return closest;
        },
        null,
      );

      if (closestOption && closestOption.value !== value) {
        onChange(closestOption.value);
      }
    });

    if (scrollEndTimeoutRef.current !== null) {
      window.clearTimeout(scrollEndTimeoutRef.current);
    }

    scrollEndTimeoutRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 120);
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="text-center text-xs">{label}</Label>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="relative h-44 overflow-y-auto rounded-xl border border-border bg-muted/25 p-1 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] snap-y snap-mandatory"
      >
        <div className="h-16" aria-hidden="true" />
        {options.map((option) => {
          const selected = option === value;

          return (
            <button
              key={option}
              ref={selected ? selectedRef : undefined}
              type="button"
              aria-pressed={selected}
              data-time-option={option}
              onClick={() => onChange(option)}
              className={cn(
                "h-10 w-full snap-center rounded-lg text-center text-base tabular transition-colors",
                selected
                  ? "bg-card font-semibold text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
        <div className="h-16" aria-hidden="true" />
      </div>
    </div>
  );
}

function TimePicker({
  value,
  onChange,
  label,
  hourLabel,
  minuteLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  hourLabel: string;
  minuteLabel: string;
}) {
  const { hour, minute } = timeParts(value);
  const selectedHour = hour || "00";
  const selectedMinute = minute || "00";

  const setHour = (nextValue: string) => {
    onChange(`${clampTimePart(nextValue, 23) || "00"}:${selectedMinute}`);
  };

  const setMinute = (nextValue: string) => {
    onChange(`${selectedHour}:${clampTimePart(nextValue, 59) || "00"}`);
  };

  return (
    <Popover>
      <PopoverTrigger className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30">
        <span className="tabular">{value || label}</span>
        <Clock className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner align="start">
          <PopoverPopup className="w-[min(22rem,calc(100vw-2rem))] p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:hidden">
              <TimeWheelColumn
                label={hourLabel}
                options={HOUR_OPTIONS}
                value={selectedHour}
                onChange={setHour}
              />
              <span className="pt-6 text-lg font-semibold text-muted-foreground">:</span>
              <TimeWheelColumn
                label={minuteLabel}
                options={MINUTE_OPTIONS}
                value={selectedMinute}
                onChange={setMinute}
              />
            </div>
            <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:grid">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transaction-time-hour">{hourLabel}</Label>
                <Input
                  id="transaction-time-hour"
                  value={selectedHour}
                  inputMode="numeric"
                  className="tabular text-center text-lg font-semibold"
                  onChange={(event) => setHour(event.target.value)}
                  onBlur={(event) => setHour(event.target.value)}
                />
              </div>
              <span className="pb-2 text-lg font-semibold text-muted-foreground">:</span>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transaction-time-minute">{minuteLabel}</Label>
                <Input
                  id="transaction-time-minute"
                  value={selectedMinute}
                  inputMode="numeric"
                  className="tabular text-center text-lg font-semibold"
                  onChange={(event) => setMinute(event.target.value)}
                  onBlur={(event) => setMinute(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 hidden grid-cols-4 gap-1.5 sm:grid">
              {["00", "15", "30", "45"].map((quickMinute) => (
                <button
                  key={quickMinute}
                  type="button"
                  onClick={() => setMinute(quickMinute)}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  :{quickMinute}
                </button>
              ))}
            </div>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}

export function TransactionForm({
  variant,
  initial,
  initialAccountId,
  onSubmit,
  onCancel,
}: {
  variant: "mobile" | "desktop";
  initial?: Transaction;
  initialAccountId?: string;
  onSubmit: (tx: TransactionCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const getCategory = useCategoryLookup();
  const favoriteCategoryIds = useFavoriteCategoryIds();
  const { t } = useLang();
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [fee, setFee] = useState<string>(initial?.fee ? String(initial.fee) : "");
  const [hasFee, setHasFee] = useState(Boolean(initial?.fee));
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [accountId, setAccountId] = useState<string>(
    initial?.accountId ?? initialAccountId ?? accounts[0]?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState<string>(
    initial?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState((initial?.date ?? todayIsoDate()).slice(0, 10));
  const [time, setTime] = useState(initial ? (initial.time ?? "") : currentLocalTime());
  const amountInputRef = useRef<HTMLInputElement>(null);

  const TYPE_TABS: { value: TxType; label: string }[] = [
    { value: "expense", label: t("form.expense") },
    { value: "income", label: t("form.income") },
    { value: "transfer", label: t("form.transfer") },
  ];

  const numericAmount = Number(amount) || 0;
  const numericFee = Number(fee) || 0;
  const visibleCats = categories.filter((c) => c.type === type && !c.isHidden);

  const canSubmit =
    numericAmount > 0 &&
    accountId.length > 0 &&
    (type === "transfer" ? toAccountId.length > 0 && accountId !== toAccountId : true) &&
    (type === "transfer" || !!categoryId);

  const { submit: submitForm, isSubmitting, errorMessage } = useFormSubmit(onSubmit);
  const fallbackMerchant =
    type === "transfer"
      ? t("form.defaultTransfer")
      : getCategory(categoryId)?.name || t("form.defaultTx");

  useEffect(() => {
    const input = amountInputRef.current;
    if (!input) return;

    if (variant === "mobile") {
      const timeoutId = window.setTimeout(() => {
        input.focus({ preventScroll: true });
      }, 250);

      return () => window.clearTimeout(timeoutId);
    }

    input.focus();
  }, [variant]);

  const submit = () => {
    if (!canSubmit) return;
    submitForm({
      type,
      amount: numericAmount,
      categoryId: type === "transfer" ? null : categoryId,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      merchant: initial?.merchant?.trim() || fallbackMerchant,
      note: note.trim() || undefined,
      date,
      time: time || undefined,
      receipt: null,
      ...(type === "transfer" && { fee: hasFee ? numericFee : 0 }),
    });
  };

  const handleFeeEnabledChange = (enabled: boolean) => {
    setHasFee(enabled);
    if (!enabled) setFee("");
  };

  const amountTone = AMOUNT_TONE_BY_TYPE[type];

  return (
    <div className="flex flex-col">
      <SheetFormHeader
        title={initial ? t("form.editTitle") : t("form.addTitle")}
        onClose={onCancel}
        closeLabel={t("form.close")}
      />

      {/* Type tabs */}
      <div className="px-4 sm:px-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setType(tab.value);
                if (tab.value !== "transfer" && getCategory(categoryId)?.type !== tab.value) {
                  setCategoryId(null);
                }
              }}
              className={cn(
                "rounded-lg py-2 text-sm font-medium transition-colors",
                type === tab.value
                  ? tab.value === "income"
                    ? "bg-income text-income-foreground"
                    : tab.value === "expense"
                      ? "bg-expense text-expense-foreground"
                      : "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AmountField
        label={t("form.amount")}
        value={amount}
        onChange={setAmount}
        tone={amountTone}
        inputRef={amountInputRef}
      />

      {type === "transfer" && (
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Switch id="transfer-fee" checked={hasFee} onCheckedChange={handleFeeEnabledChange} />
            <Label htmlFor="transfer-fee">{t("form.fee")}</Label>
          </div>
          {hasFee && (
            <AmountField label={t("form.fee")} value={fee} onChange={setFee} tone="expense" />
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        {/* Categories */}
        {type !== "transfer" && (
          <div className="flex flex-col gap-2">
            <Label>{t("form.category")}</Label>
            <FavoriteCategoryPicker
              categories={visibleCats}
              favoriteCategoryIds={favoriteCategoryIds}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          </div>
        )}

        {/* Account / transfer pickers */}
        {type === "transfer" ? (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label>{t("form.fromAccount")}</Label>
              <AccountSelect
                value={accountId}
                onChange={setAccountId}
                accounts={accounts}
                placeholder={t("form.selectAccount")}
              />
            </div>
            <ArrowRight className="mb-2.5 size-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-2">
              <Label>{t("form.toAccount")}</Label>
              <AccountSelect
                value={toAccountId}
                onChange={setToAccountId}
                accounts={accounts}
                placeholder={t("form.selectAccount")}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>{t("form.account")}</Label>
            <AccountSelect
              value={accountId}
              onChange={setAccountId}
              accounts={accounts}
              placeholder={t("form.selectAccount")}
            />
          </div>
        )}

        {/* Date */}
        <div className="flex flex-col gap-2">
          <Label>{t("form.date")}</Label>
          <DatePicker value={date} onChange={setDate} max={todayIsoDate()} />
        </div>

        {/* Time */}
        <div className="flex flex-col gap-2">
          <Label>{t("form.time")}</Label>
          <TimePicker
            value={time}
            onChange={setTime}
            label={t("form.time")}
            hourLabel={t("form.timeHour")}
            minuteLabel={t("form.timeMinute")}
          />
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="note">{t("form.note")}</Label>
          <Textarea
            id="note"
            rows={2}
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
        submitLabel={initial ? t("form.save") : t("form.submit")}
        onSubmit={submit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

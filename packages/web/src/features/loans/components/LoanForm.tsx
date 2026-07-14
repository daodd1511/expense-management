import { useState } from "react";
import { useLang } from "@/core/i18n";
import { AccountSelect } from "@/features/accounts/components/AccountSelect";
import { AmountField } from "@/shared/components/AmountField";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { FormFooterBar } from "@/shared/components/FormFooterBar";
import { SheetFormHeader } from "@/shared/components/SheetFormHeader";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input, Label, Textarea } from "@/shared/components/ui/input";
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
import { todayLocalIso } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import type {
  Account,
  DisbursedLoanCreate,
  LoanDirection,
  OpeningLoanCreate,
  Person,
} from "@wallet/shared";

export type LoanFormSubmission =
  | { mode: "disbursed"; input: DisbursedLoanCreate }
  | { mode: "opening"; input: OpeningLoanCreate };

export function LoanForm({
  people,
  accounts,
  onCreatePerson,
  onSubmit,
  onCancel,
}: {
  people: readonly Person[];
  accounts: readonly Account[];
  onCreatePerson: (name: string) => Promise<Person>;
  onSubmit: (submission: LoanFormSubmission) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const today = todayLocalIso();
  const [direction, setDirection] = useState<LoanDirection>("lending");
  const [opening, setOpening] = useState(false);
  const [personMode, setPersonMode] = useState<"existing" | "new">(
    people.length > 0 ? "existing" : "new",
  );
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [personName, setPersonName] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [originalDate, setOriginalDate] = useState("");
  const [note, setNote] = useState("");
  const amount = Number(amountRaw) || 0;
  const hasPerson = personMode === "new" ? personName.trim().length > 0 : personId.length > 0;
  const canSubmit = hasPerson && amount > 0 && date.length > 0 && (opening || accountId.length > 0);

  const submitLoan = async () => {
    const resolvedPersonId =
      personMode === "new" ? (await onCreatePerson(personName.trim())).id : personId;
    const common = {
      personId: resolvedPersonId,
      direction,
      description: description.trim() || undefined,
      amount,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
    };

    if (opening) {
      await onSubmit({
        mode: "opening",
        input: {
          ...common,
          balanceAsOf: date,
          originalDate: originalDate || undefined,
        },
      });
      return;
    }

    await onSubmit({ mode: "disbursed", input: { ...common, accountId, date } });
  };
  const { submit, isSubmitting, errorMessage } = useFormSubmit(submitLoan);

  return (
    <div className="flex flex-col">
      <SheetFormHeader title={t("loans.newLoan")} onClose={onCancel} closeLabel={t("form.close")} />
      <div className="px-4 sm:px-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["lending", "borrowing"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={direction === value}
              onClick={() => setDirection(value)}
              className={cn(
                "rounded-lg py-2.5 text-sm font-semibold transition-colors",
                direction === value
                  ? value === "lending"
                    ? "bg-income text-income-foreground"
                    : "bg-expense text-expense-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "lending" ? t("loans.lending") : t("loans.borrowing")}
            </button>
          ))}
        </div>
      </div>

      <AmountField
        label={opening ? t("loans.openingBalance") : t("form.amount")}
        value={amountRaw}
        onChange={setAmountRaw}
        tone={direction === "lending" ? "income" : "expense"}
      />

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Label>{t("loans.person")}</Label>
          {people.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {(["existing", "new"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={personMode === value}
                  onClick={() => setPersonMode(value)}
                  className={cn(
                    "rounded-xl border py-2 text-sm font-medium",
                    personMode === value
                      ? "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {value === "existing" ? t("loans.existingPerson") : t("loans.newPerson")}
                </button>
              ))}
            </div>
          )}
          {personMode === "existing" && people.length > 0 ? (
            <Select value={personId} onValueChange={(value) => value && setPersonId(value)}>
              <SelectTrigger aria-label={t("loans.person")}>
                <SelectValue>
                  {(selected: string | null) =>
                    people.find((person) => person.id === selected)?.name ?? t("loans.selectPerson")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner>
                  <SelectPopup>
                    {people.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </SelectPositioner>
              </SelectPortal>
            </Select>
          ) : (
            <Input
              aria-label={t("loans.personName")}
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              placeholder={t("loans.personPlaceholder")}
            />
          )}
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
          <span>
            <span className="block text-sm font-medium">{t("loans.trackExisting")}</span>
            <span className="block text-xs text-muted-foreground">
              {t("loans.trackExistingHint")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={opening}
            onChange={(event) => setOpening(event.target.checked)}
            className="size-4 accent-primary"
          />
        </label>

        {!opening && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="loan-account">{t("form.account")}</Label>
            <AccountSelect
              id="loan-account"
              value={accountId}
              onChange={setAccountId}
              accounts={[...accounts]}
              placeholder={t("form.selectAccount")}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>{opening ? t("loans.balanceAsOf") : t("form.date")}</Label>
            <DatePicker value={date} onChange={setDate} max={today} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("loans.dueDateOptional")}</Label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>
        </div>

        {opening && (
          <div className="flex flex-col gap-2">
            <Label>{t("loans.originalDateOptional")}</Label>
            <DatePicker value={originalDate} onChange={setOriginalDate} max={today} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="loan-description">{t("loans.description")}</Label>
          <Input
            id="loan-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("loans.descriptionPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="loan-note">{t("form.note")}</Label>
          <Textarea
            id="loan-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
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
        submitLabel={t("loans.createLoan")}
        onSubmit={() => submit(undefined)}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

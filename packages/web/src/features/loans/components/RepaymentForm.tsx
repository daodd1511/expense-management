import { useState } from "react";
import { useLang } from "@/core/i18n";
import { AccountSelect } from "@/features/accounts/components/AccountSelect";
import { AmountField } from "@/shared/components/AmountField";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { FormFooterBar } from "@/shared/components/FormFooterBar";
import { SheetFormHeader } from "@/shared/components/SheetFormHeader";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Label } from "@/shared/components/ui/input";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { todayLocalIso } from "@/shared/lib/date";
import type { Account, LoanDetail, LoanEvent, LoanRepaymentCreate } from "@wallet/shared";

export function RepaymentForm({
  loan,
  initial,
  accounts,
  onSubmit,
  onCancel,
}: {
  loan: LoanDetail;
  initial?: LoanEvent;
  accounts: readonly Account[];
  onSubmit: (input: LoanRepaymentCreate) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const today = todayLocalIso();
  const [amountRaw, setAmountRaw] = useState(String(initial?.amount ?? loan.outstandingBalance));
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(initial?.date ?? today);
  const amount = Number(amountRaw) || 0;
  const canSubmit =
    amount > 0 &&
    amount <= loan.outstandingBalance + (initial?.amount ?? 0) &&
    accountId.length > 0 &&
    date.length > 0;
  const { submit, isSubmitting, errorMessage } = useFormSubmit(onSubmit);

  const handleSubmit = () => {
    if (!canSubmit) return;
    submit({ amount, accountId, date });
  };

  return (
    <div className="flex flex-col">
      <SheetFormHeader
        title={initial ? t("loans.editRepayment") : t("loans.recordRepayment")}
        onClose={onCancel}
        closeLabel={t("form.close")}
      />
      <AmountField
        label={t("form.amount")}
        value={amountRaw}
        onChange={setAmountRaw}
        tone={loan.direction === "lending" ? "income" : "expense"}
      />
      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t("loans.repaymentLimit")}
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repayment-account">{t("form.account")}</Label>
          <AccountSelect
            id="repayment-account"
            value={accountId}
            onChange={setAccountId}
            accounts={[...accounts]}
            placeholder={t("form.selectAccount")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("form.date")}</Label>
          <DatePicker value={date} onChange={setDate} max={today} />
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
        submitLabel={initial ? t("form.save") : t("loans.recordRepayment")}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

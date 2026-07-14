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
import type { Account, LoanDetail, LoanDisbursementPatch } from "@wallet/shared";

export function OriginForm({
  loan,
  accounts,
  onSubmit,
  onCancel,
}: {
  loan: LoanDetail;
  accounts: readonly Account[];
  onSubmit: (patch: LoanDisbursementPatch) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const origin = loan.events.find((event) => event.kind === "disbursement");
  const [amountRaw, setAmountRaw] = useState(String(origin?.amount ?? loan.originAmount));
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(origin?.date ?? todayLocalIso());
  const amount = Number(amountRaw) || 0;
  const canSubmit = amount > 0 && accountId.length > 0 && date.length > 0;
  const { submit, isSubmitting, errorMessage } = useFormSubmit(onSubmit);

  return (
    <div className="flex flex-col">
      <SheetFormHeader
        title={t("loans.correctOrigin")}
        onClose={onCancel}
        closeLabel={t("form.close")}
      />
      <AmountField
        label={t("loans.originAmount")}
        value={amountRaw}
        onChange={setAmountRaw}
        tone={loan.direction === "lending" ? "income" : "expense"}
      />
      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <p className="rounded-xl bg-accent px-3 py-2 text-xs text-accent-foreground">
          {t("loans.originCorrectionHint")}
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="origin-account">{t("form.account")}</Label>
          <AccountSelect
            id="origin-account"
            value={accountId}
            onChange={setAccountId}
            accounts={[...accounts]}
            placeholder={t("form.selectAccount")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("form.date")}</Label>
          <DatePicker value={date} onChange={setDate} max={todayLocalIso()} />
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
        submitLabel={t("form.save")}
        onSubmit={() => submit({ amount, accountId, date })}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

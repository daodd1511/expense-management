import { useAccountLookup } from "@/features/accounts/queries";
import { useCategoryLookup } from "@/features/categories/queries";
import type { Subscription } from "@/core/types";
import { useLang } from "@/core/i18n";
import { Button } from "@/shared/components/ui/button";
import { BottomSheet, Modal } from "@/shared/components/ui/overlay";
import { formatShortDate, formatVND } from "@/shared/lib/format";

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 px-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function SubscriptionLogConfirm({
  open,
  subscription,
  transactionDate,
  variant,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  subscription: Subscription | null;
  transactionDate: string;
  variant: "modal" | "sheet";
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (subscription: Subscription) => void | Promise<void>;
}) {
  const { t } = useLang();
  const getCategory = useCategoryLookup();
  const getAccount = useAccountLookup();

  if (!open || subscription == null) return null;

  const category = getCategory(subscription.categoryId)?.name ?? "—";
  const account = getAccount(subscription.accountId)?.name ?? "—";

  const handleCancel = () => {
    if (isSubmitting) return;
    onCancel();
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    await onConfirm(subscription);
  };

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t("sub.logConfirmTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("sub.logConfirmMessage", { name: subscription.name })}
        </p>
      </div>

      <dl className="flex flex-col gap-2">
        <PreviewRow label={t("form.category")} value={category} />
        <PreviewRow label={t("form.account")} value={account} />
        <PreviewRow label={t("form.date")} value={formatShortDate(transactionDate)} />
        <PreviewRow label={t("sub.logConfirmAmount")} value={formatVND(subscription.amount)} />
      </dl>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>
          {t("form.cancel")}
        </Button>
        <Button
          type="button"
          loading={isSubmitting}
          loadingLabel={t("sub.loggingPayment")}
          onClick={() => void handleConfirm()}
        >
          {t("sub.logConfirmAction")}
        </Button>
      </div>
    </div>
  );

  if (variant === "sheet") {
    return (
      <BottomSheet open={open} onClose={handleCancel} title={t("sub.logConfirmTitle")}>
        <div className="flex flex-col gap-4 px-4 pt-2 pb-4">{content}</div>
      </BottomSheet>
    );
  }

  return (
    <Modal open={open} onClose={handleCancel} className="p-4 sm:p-5">
      {content}
    </Modal>
  );
}

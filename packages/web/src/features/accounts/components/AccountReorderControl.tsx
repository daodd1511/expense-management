import { useState } from "react";
import { useLang } from "@/core/i18n";
import type { Account } from "@/core/types";
import { Button } from "@/shared/components/ui/button";
import { BottomSheet, Modal } from "@/shared/components/ui/overlay";
import { AccountReorderList } from "./AccountReorderList";

function ReorderContent({
  accounts,
  onReorder,
  onClose,
  disabled,
}: {
  accounts: readonly Account[];
  onReorder: (accountIds: string[]) => void;
  onClose: () => void;
  disabled: boolean;
}) {
  const { t } = useLang();

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("accounts.reorderTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("accounts.reorderDescription")}
        </p>
      </div>
      <AccountReorderList accounts={accounts} onReorder={onReorder} disabled={disabled} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="button" onClick={onClose}>
          {t("accounts.reorderDone")}
        </Button>
      </div>
    </div>
  );
}

/** Text-only reorder trigger with a desktop dialog or mobile bottom sheet. */
export function AccountReorderControl({
  variant,
  accounts,
  onReorder,
  disabled = false,
}: {
  variant: "desktop" | "mobile";
  accounts: readonly Account[];
  onReorder: (accountIds: string[]) => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const title = t("accounts.reorderTitle");
  const content = (
    <ReorderContent
      accounts={accounts}
      onReorder={onReorder}
      onClose={() => setOpen(false)}
      disabled={disabled}
    />
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={variant === "mobile" ? "sm" : "default"}
        onClick={() => setOpen(true)}
        disabled={accounts.length < 2}
      >
        {t("accounts.reorder")}
      </Button>
      {variant === "desktop" ? (
        <Modal open={open} onClose={() => setOpen(false)} title={title}>
          {content}
        </Modal>
      ) : (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={title}>
          {content}
        </BottomSheet>
      )}
    </>
  );
}

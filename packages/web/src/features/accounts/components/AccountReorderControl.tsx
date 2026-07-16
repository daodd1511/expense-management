import { useState } from "react";
import { useLang } from "@/core/i18n";
import type { Account } from "@/core/types";
import { Button } from "@/shared/components/ui/button";
import { BottomSheet, Modal } from "@/shared/components/ui/overlay";
import { AccountReorderList } from "./AccountReorderList";

function ReorderContent({
  accounts,
  onReorder,
  onSave,
  onClose,
  saving,
  changed,
}: {
  accounts: readonly Account[];
  onReorder: (accountIds: string[]) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  changed: boolean;
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
      <AccountReorderList accounts={accounts} onReorder={onReorder} disabled={saving} />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          {t("form.cancel")}
        </Button>
        <Button type="button" onClick={onSave} disabled={!changed} loading={saving}>
          {t("accounts.reorderSave")}
        </Button>
      </div>
    </div>
  );
}

/** Text-only reorder trigger with a desktop dialog or mobile bottom sheet. */
export function AccountReorderControl({
  variant,
  accounts,
  onSave,
  disabled = false,
}: {
  variant: "desktop" | "mobile";
  accounts: readonly Account[];
  onSave: (accountIds: string[]) => Promise<unknown>;
  disabled?: boolean;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [draftAccounts, setDraftAccounts] = useState<Account[]>([]);
  const [initialAccountIds, setInitialAccountIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const title = t("accounts.reorderTitle");

  const openOverlay = () => {
    setDraftAccounts([...accounts]);
    setInitialAccountIds(accounts.map((account) => account.id));
    setOpen(true);
  };

  const closeOverlay = () => {
    if (saving) return;
    setOpen(false);
    setDraftAccounts([]);
    setInitialAccountIds([]);
  };

  const reorderDraft = (accountIds: string[]) => {
    const accountsById = new Map(draftAccounts.map((account) => [account.id, account]));
    const reordered = accountIds.flatMap((id) => {
      const account = accountsById.get(id);
      return account ? [account] : [];
    });
    if (reordered.length !== draftAccounts.length) return;
    setDraftAccounts(
      reordered.map((account, displayOrder) => ({ ...account, displayOrder })),
    );
  };

  const draftAccountIds = draftAccounts.map((account) => account.id);
  const changed = draftAccountIds.some((id, index) => id !== initialAccountIds[index]);

  const saveDraft = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      await onSave(draftAccountIds);
      setOpen(false);
      setDraftAccounts([]);
      setInitialAccountIds([]);
    } catch {
      // The mutation layer reports the error; keep the draft open so the User can retry.
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <ReorderContent
      accounts={draftAccounts}
      onReorder={reorderDraft}
      onSave={() => void saveDraft()}
      onClose={closeOverlay}
      saving={saving}
      changed={changed}
    />
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={variant === "mobile" ? "sm" : "default"}
        onClick={openOverlay}
        disabled={disabled || accounts.length < 2}
      >
        {t("accounts.reorder")}
      </Button>
      {variant === "desktop" ? (
        <Modal open={open} onClose={closeOverlay} title={title}>
          {content}
        </Modal>
      ) : (
        <BottomSheet open={open} onClose={closeOverlay} title={title}>
          {content}
        </BottomSheet>
      )}
    </>
  );
}

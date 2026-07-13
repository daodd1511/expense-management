import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/overlay";
import { useLang } from "@/core/i18n";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmLoadingLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmLoadingLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!open) setIsConfirming(false);
  }, [open]);

  const handleCancel = () => {
    if (isConfirming) return;
    onCancel();
  };

  const handleConfirm = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal open={open} onClose={handleCancel} className="p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{title ?? t("confirm.deleteTitle")}</h2>
          <p className="text-sm text-muted-foreground">{message ?? t("confirm.deleteMessage")}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isConfirming} onClick={handleCancel}>
            {cancelLabel ?? t("confirm.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={isConfirming}
            loadingLabel={confirmLoadingLabel ?? t("confirm.deleting")}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel ?? t("confirm.delete")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

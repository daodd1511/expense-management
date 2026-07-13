import { X } from "lucide-react";

/** Title row + close button shared by every full-screen sheet/drawer form (transaction, budget, subscription). */
export function SheetFormHeader({
  title,
  onClose,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-3 sm:px-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

import { useEffect } from "react";
import { cn } from "@/shared/lib/utils";

function useDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  fullHeight = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Fixed 92dvh instead of shrink-to-fit — for a sheet stacked on top of another sheet, so it
   * consistently covers the sheet underneath instead of leaving a content-dependent gap. */
  fullHeight?: boolean;
}) {
  useDismiss(open, onClose);
  if (!open) return null;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-3xl border-t border-border bg-card shadow-sm animate-in slide-in-from-bottom duration-300",
          fullHeight ? "h-[92dvh]" : "max-h-[92dvh]",
        )}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-card pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </>
  );
}

export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useDismiss(open, onClose);
  if (!open) return null;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-sm animate-in slide-in-from-right duration-300"
      >
        {children}
      </div>
    </>
  );
}

export function Modal({
  open,
  onClose,
  children,
  className,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  useDismiss(open, onClose);
  if (!open) return null;
  return (
    <>
      <Backdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-sm animate-in fade-in zoom-in-95 duration-200",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}

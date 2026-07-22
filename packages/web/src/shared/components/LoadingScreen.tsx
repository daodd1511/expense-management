import { Wallet } from "lucide-react";
import { useLang } from "@/core/i18n";

/**
 * Full-viewport splash shown while auth resolves and the app's first data loads.
 * A single centered brand mark with a soft pulsing halo — one quiet loading cue,
 * no spinner or visible text. The "loading" copy is kept for screen readers only.
 */
export function LoadingScreen() {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-background text-foreground"
    >
      <div className="relative flex items-center justify-center">
        {/* Twin staggered halos read as one gentle heartbeat behind the mark. */}
        <span
          aria-hidden="true"
          className="absolute size-16 rounded-2xl bg-primary [animation:splash-halo_1.9s_var(--ease-out)_infinite]"
        />
        <span
          aria-hidden="true"
          className="absolute size-16 rounded-2xl bg-primary [animation:splash-halo_1.9s_var(--ease-out)_infinite] [animation-delay:0.95s]"
        />
        <span className="relative inline-flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Wallet className="size-8" />
        </span>
      </div>
      <span className="sr-only">{t("app.loading")}</span>
    </div>
  );
}

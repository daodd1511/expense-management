import { LoaderCircle, Wallet } from "lucide-react";
import { useLang } from "@/core/i18n";

export function LoadingScreen() {
  const { t } = useLang();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Wallet className="size-7" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">{t("app.loading")}</p>
      </div>
    </div>
  );
}

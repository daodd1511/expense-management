import { useNavigate } from "@tanstack/react-router";
import { WalletCards } from "lucide-react";
import { useLang } from "@/core/i18n";
import { Button } from "@/shared/components/ui/button";

export function FirstAccountState() {
  const navigate = useNavigate();
  const { t } = useLang();

  const handleCreateAccount = () => {
    navigate({ to: "/accounts", search: { create: String(Date.now()) } });
  };

  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <WalletCards className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{t("accounts.firstTitle")}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("accounts.firstDescription")}
      </p>
      <Button className="mt-5" size="lg" onClick={handleCreateAccount}>
        {t("accounts.firstAction")}
      </Button>
    </section>
  );
}

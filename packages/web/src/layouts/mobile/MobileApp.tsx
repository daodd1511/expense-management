import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ChartPie, Ellipsis, Home, Plus, Settings, Wallet } from "lucide-react";
import {
  TransactionOverlaySheet,
  useTransactionOverlay,
} from "@/features/transactions/transaction-overlay";
import { monthFromHref } from "@/features/transactions/view-state";
import { LoadingScreen } from "@/shared/components/LoadingScreen";
import { useLang } from "@/core/i18n";
import { useAppDataLoading } from "@/shared/hooks/useAppDataLoading";
import { cn } from "@/shared/lib/utils";
import {
  isSettingsSection,
  sectionFromPath,
} from "@/routing/app-route-state";

export function MobileApp() {
  const loading = useAppDataLoading();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCreate } = useTransactionOverlay();
  const section = sectionFromPath(location.pathname);

  const title =
    section === "reports"
      ? t("nav.reports")
      : section === "other"
        ? t("nav.other")
        : section === "transactions"
          ? t("nav.transactions")
          : section === "accounts"
            ? t("nav.accounts")
            : section === "budgets"
              ? t("nav.budgets")
              : section === "subscriptions"
                ? t("nav.subscriptions")
                : section === "settings"
                  ? t("nav.settings")
                  : section === "settings-categories"
                    ? t("settings.categories")
                    : t("nav.dashboard");

  const NAV: {
    href: "/" | "/accounts" | "/reports" | "/other";
    label: string;
    icon: typeof Home;
    active: boolean;
  }[] = [
    {
      href: "/",
      label: t("nav.home"),
      icon: Home,
      active: section === "dashboard",
    },
    {
      href: "/accounts",
      label: t("nav.accounts"),
      icon: Wallet,
      active: section === "accounts",
    },
    {
      href: "/reports",
      label: t("nav.reports"),
      icon: ChartPie,
      active: section === "reports",
    },
    {
      href: "/other",
      label: t("nav.other"),
      icon: Ellipsis,
      active: section === "other",
    },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              navigate({ to: isSettingsSection(section) ? "/" : "/settings" })
            }
            aria-label={t("nav.settings")}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg transition-colors",
              isSettingsSection(section)
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      {/* Screen */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav with center FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md">
        <div className="relative border-t border-border bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          <div className="grid grid-cols-5 items-center">
            {NAV.slice(0, 2).map((n) => (
              <NavButton
                key={n.href}
                label={n.label}
                icon={n.icon}
                active={n.active}
                onClick={() => navigate({ to: n.href })}
              />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => openCreate(monthFromHref(location.href))}
                aria-label={t("app.addTransaction")}
                className="-mt-7 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6" />
              </button>
            </div>
            {NAV.slice(2).map((n) => (
              <NavButton
                key={n.href}
                label={n.label}
                icon={n.icon}
                active={n.active}
                onClick={() => navigate({ to: n.href })}
              />
            ))}
          </div>
        </div>
      </nav>

      <TransactionOverlaySheet variant="mobile" />
    </div>
  );
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Home;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 py-1 text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <Icon className={cn("size-5", active && "fill-primary/15")} />
      </span>
      {label}
    </button>
  );
}

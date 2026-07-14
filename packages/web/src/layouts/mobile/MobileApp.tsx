import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Landmark, Plus, Receipt, Settings, Target, Wallet } from "lucide-react";
import {
  TransactionOverlaySheet,
  useTransactionOverlay,
} from "@/features/transactions/transaction-overlay";
import { monthFromHref } from "@/features/transactions/view-state";
import { LoadingScreen } from "@/shared/components/LoadingScreen";
import { useLang } from "@/core/i18n";
import type { TranslationKey } from "@/core/i18n";
import { useAppDataLoading } from "@/shared/hooks/useAppDataLoading";
import { cn } from "@/shared/lib/utils";
import {
  isSettingsSection,
  navigationAreaFromSection,
  sectionFromPath,
} from "@/routing/app-route-state";
import type { AppSection } from "@/routing/app-route-state";

const TITLE_KEY_BY_SECTION: Record<AppSection, TranslationKey> = {
  dashboard: "nav.dashboard",
  reports: "nav.reports",
  transactions: "nav.transactions",
  planning: "nav.plan",
  budgets: "nav.budgets",
  subscriptions: "nav.subscriptions",
  position: "nav.position",
  accounts: "nav.accounts",
  loans: "nav.loans",
  settings: "nav.settings",
  "settings-categories": "settings.categories",
};

export function MobileApp() {
  const loading = useAppDataLoading();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCreate } = useTransactionOverlay();
  const section = sectionFromPath(location.pathname);
  const activeArea = navigationAreaFromSection(section);

  const title = t(TITLE_KEY_BY_SECTION[section]);

  const NAV: {
    href: "/" | "/transactions" | "/planning" | "/position";
    label: string;
    icon: typeof Home;
    active: boolean;
  }[] = [
    {
      href: "/",
      label: t("nav.home"),
      icon: Home,
      active: activeArea === "overview",
    },
    {
      href: "/transactions",
      label: t("nav.activity"),
      icon: Receipt,
      active: activeArea === "activity",
    },
    {
      href: "/planning",
      label: t("nav.plan"),
      icon: Target,
      active: activeArea === "planning",
    },
    {
      href: "/position",
      label: t("nav.position"),
      icon: Landmark,
      active: activeArea === "position",
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
            onClick={() => navigate({ to: isSettingsSection(section) ? "/" : "/settings" })}
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
                href={n.href}
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
                href={n.href}
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
  href,
}: {
  label: string;
  icon: typeof Home;
  active: boolean;
  href: "/" | "/transactions" | "/planning" | "/position";
}) {
  return (
    <Link
      to={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 py-1 text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <Icon className={cn("size-5", active && "fill-primary/15")} />
      </span>
      {label}
    </Link>
  );
}

import type { CSSProperties } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  ChartPie,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Plus,
  Receipt,
  Settings,
  Target,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLang } from "@/core/i18n";
import { dueBanner } from "@/features/subscriptions/helpers";
import { useSubscriptions } from "@/features/subscriptions/queries";
import {
  TransactionOverlaySheet,
  useTransactionOverlay,
} from "@/features/transactions/transaction-overlay";
import { useTransactions } from "@/features/transactions/queries";
import { monthFromHref } from "@/features/transactions/view-state";
import { sectionFromPath } from "@/routing/app-route-state";
import type { AppSection } from "@/routing/app-route-state";
import { DESKTOP_NAVIGATION } from "@/routing/navigation";
import { CommandPalette, type CommandPaletteAction } from "@/shared/components/CommandPalette";
import { LoadingScreen } from "@/shared/components/LoadingScreen";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/shared/components/ui/sidebar";
import { useAppDataLoading } from "@/shared/hooks/useAppDataLoading";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";

const ICON_BY_SECTION: Partial<Record<AppSection, LucideIcon>> = {
  dashboard: LayoutDashboard,
  reports: ChartPie,
  transactions: Receipt,
  budgets: Target,
  subscriptions: CalendarClock,
  accounts: Wallet,
  loans: HandCoins,
  settings: Settings,
};

export function DesktopApp() {
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: transactions = [] } = useTransactions();
  const loading = useAppDataLoading();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCreate } = useTransactionOverlay();
  const section = sectionFromPath(location.pathname);
  const dueCount = dueBanner(subscriptions, transactions).length;
  const navigationItems = DESKTOP_NAVIGATION.flatMap((group) => group.items);

  const openNewTransaction = () => openCreate(monthFromHref(location.href));

  const focusTransactionsSearch = () => {
    if (section === "transactions") {
      document.querySelector<HTMLInputElement>('[data-global-search="transactions"]')?.focus();
    } else {
      navigate({ to: "/transactions", search: { focus: "search" } });
    }
  };

  const paletteActions: CommandPaletteAction[] = [
    ...navigationItems.map((item) => ({
      id: `nav-${item.section}`,
      label: t(item.labelKey),
      section: t("palette.sectionNavigate"),
      onRun: () => navigate({ to: item.href }),
    })),
    {
      id: "nav-categories",
      label: t("settings.categories"),
      section: t("palette.sectionNavigate"),
      onRun: () => navigate({ to: "/settings/categories" }),
    },
    {
      id: "nav-settings",
      label: t("nav.settings"),
      section: t("palette.sectionNavigate"),
      onRun: () => navigate({ to: "/settings" }),
    },
    {
      id: "create-transaction",
      label: t("app.addTransaction"),
      section: t("palette.sectionCreate"),
      onRun: openNewTransaction,
    },
    {
      id: "create-account",
      label: t("palette.newAccount"),
      section: t("palette.sectionCreate"),
      onRun: () => navigate({ to: "/accounts", search: { create: String(Date.now()) } }),
    },
    {
      id: "create-budget",
      label: t("palette.newBudget"),
      section: t("palette.sectionCreate"),
      onRun: () => navigate({ to: "/budgets", search: { create: String(Date.now()) } }),
    },
    {
      id: "create-subscription",
      label: t("palette.newSubscription"),
      section: t("palette.sectionCreate"),
      onRun: () => navigate({ to: "/subscriptions", search: { create: String(Date.now()) } }),
    },
    {
      id: "create-loan",
      label: t("palette.newLoan"),
      section: t("palette.sectionCreate"),
      onRun: () => navigate({ to: "/loans", search: { create: String(Date.now()) } }),
    },
  ];

  useKeyboardShortcuts([
    { key: "n", handler: openNewTransaction },
    { key: "/", handler: focusTransactionsSearch },
  ]);

  if (loading) return <LoadingScreen />;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "15rem",
        } as CSSProperties
      }
    >
      <Sidebar
        collapsible="none"
        className="sticky top-0 h-dvh overflow-hidden border-r border-sidebar-border p-2"
      >
        <SidebarHeader className="p-2">
          <div className="flex min-h-11 items-center gap-2.5 overflow-hidden rounded-xl px-1">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CreditCard className="size-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{t("app.name")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("app.tagline")}</p>
            </div>
          </div>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t("app.addTransaction")}
                onClick={openNewTransaction}
                className="h-10 justify-center rounded-xl bg-primary py-0 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              >
                <Plus />
                <span>{t("app.addTransaction")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="gap-1 py-1">
          {DESKTOP_NAVIGATION.map((group) => (
            <SidebarGroup key={group.labelKey} className="py-1">
              <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => {
                    const Icon = ICON_BY_SECTION[item.section] ?? LayoutDashboard;
                    const badge = item.section === "subscriptions" ? dueCount : 0;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link to={item.href} />}
                          tooltip={t(item.labelKey)}
                          isActive={section === item.section}
                          aria-current={section === item.section ? "page" : undefined}
                          className="h-10 rounded-xl px-3"
                        >
                          <Icon />
                          <span>{t(item.labelKey)}</span>
                        </SidebarMenuButton>
                        {badge > 0 && (
                          <SidebarMenuBadge className="bg-expense text-expense-foreground">
                            {badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="mt-auto p-2">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link to="/settings" />}
                tooltip={t("nav.settings")}
                isActive={section === "settings" || section === "settings-categories"}
                aria-current={
                  section === "settings" || section === "settings-categories" ? "page" : undefined
                }
                className="h-10 rounded-xl px-3"
              >
                <Settings />
                <span>{t("nav.settings")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex items-center justify-between rounded-xl border border-sidebar-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("settings.appearance")}
            </span>
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-x-hidden">
        <div className="flex-1 px-5 py-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </SidebarInset>

      <TransactionOverlaySheet variant="desktop" />
      <CommandPalette actions={paletteActions} />
    </SidebarProvider>
  );
}

import { startTransition } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, CalendarClock, Settings, Tags, Target } from "lucide-react";
import { SubscriptionDueBanner } from "@/features/subscriptions/components/SubscriptionDueBanner";
import { useTransactionOverlay } from "@/features/transactions/transaction-overlay";
import { MobileAccounts } from "@/features/accounts/components/MobileAccounts";
import { DesktopAccounts } from "@/features/accounts/components/DesktopAccounts";
import { DesktopBudgets } from "@/features/budgets/components/DesktopBudgets";
import { MobileBudgets } from "@/features/budgets/components/MobileBudgets";
import { CategoriesPage } from "@/features/categories/components/CategoriesPage";
import { DesktopDashboard } from "@/features/dashboard/components/DesktopDashboard";
import { MobileHome } from "@/features/dashboard/components/MobileHome";
import { DesktopSettings } from "@/features/settings/components/Settings";
import { MobileSettings } from "@/features/settings/components/MobileSettings";
import { DesktopSubscriptions } from "@/features/subscriptions/components/DesktopSubscriptions";
import { MobileSubscriptions } from "@/features/subscriptions/components/MobileSubscriptions";
import { ReportsPage as ReportsShell } from "@/features/reports/components/ReportsPage";
import { DesktopTransactionsTable } from "@/features/transactions/components/DesktopTransactionsTable";
import { MobileTransactions } from "@/features/transactions/components/MobileTransactions";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useLang } from "@/core/i18n";
import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import type { Transaction } from "@/core/types";
import {
  buildTransactionsSearch,
  parseTransactionsViewState,
  type TransactionsViewState,
} from "@/features/transactions/view-state";
import { sectionFromPath } from "./app-route-state";
import { validateCreateIntentSearch } from "./create-intent";

function useAppNavigation() {
  const navigate = useNavigate();

  return {
    goDashboard: () => navigate({ to: "/" }),
    goTransactions: (search?: Record<string, string | undefined>) =>
      navigate({ to: "/transactions", search }),
    goBudgets: () => navigate({ to: "/budgets" }),
    goSubscriptions: () => navigate({ to: "/subscriptions" }),
    goAccounts: () => navigate({ to: "/accounts" }),
    goSettings: () => navigate({ to: "/settings" }),
    goOther: () => navigate({ to: "/other" }),
  };
}

function useTransactionNavigation() {
  const { openEdit } = useTransactionOverlay();

  return {
    openEdit: (transaction: Transaction) => openEdit(transaction.id, transaction.date.slice(0, 7)),
  };
}

export function DashboardPage() {
  const isDesktop = useIsDesktop();
  const { openEdit } = useTransactionNavigation();
  const navigation = useAppNavigation();

  if (isDesktop) {
    return (
      <DesktopDashboard
        onNavigate={(section, search) => {
          if (section === "budgets") navigation.goBudgets();
          else if (section === "subscriptions") navigation.goSubscriptions();
          else if (section === "accounts") navigation.goAccounts();
          else if (section === "transactions") navigation.goTransactions(search);
        }}
        onEdit={openEdit}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <SubscriptionDueBanner confirmVariant="sheet" />
      <MobileHome
        onNavigate={(section, search) => {
          if (section === "budgets") navigation.goBudgets();
          else if (section === "subscriptions") navigation.goSubscriptions();
          else if (section === "accounts") navigation.goAccounts();
          else if (section === "transactions") navigation.goTransactions(search);
        }}
        onEdit={openEdit}
      />
    </div>
  );
}

export function TransactionsPage() {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const { openEdit } = useTransactionNavigation();
  const rawSearch = location.search as Record<string, unknown>;
  const state = parseTransactionsViewState(rawSearch);
  const shouldFocusSearch = rawSearch.focus === "search";

  const updateTransactionsState = (
    patch:
      | Partial<TransactionsViewState>
      | ((current: TransactionsViewState) => TransactionsViewState),
  ) => {
    const nextState = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    startTransition(() => {
      void navigate({
        to: "/transactions",
        search: buildTransactionsSearch(nextState),
        replace: true,
      });
    });
  };

  return isDesktop ? (
    <DesktopTransactionsTable
      onEdit={openEdit}
      month={state.month}
      query={state.query}
      type={state.type}
      categoryId={state.categoryId}
      accountId={state.accountId}
      onMonthChange={(month) => updateTransactionsState({ month })}
      onQueryChange={(query) => updateTransactionsState({ query })}
      onTypeChange={(type) => updateTransactionsState({ type })}
      onCategoryChange={(categoryId) => updateTransactionsState({ categoryId })}
      onAccountChange={(accountId) => updateTransactionsState({ accountId })}
      shouldFocusSearch={shouldFocusSearch}
      onSearchFocusHandled={() =>
        navigate({ to: "/transactions", search: buildTransactionsSearch(state), replace: true })
      }
    />
  ) : (
    <MobileTransactions
      onEdit={openEdit}
      month={state.month}
      query={state.query}
      type={state.type}
      categoryId={state.categoryId}
      accountId={state.accountId}
      onMonthChange={(month) => updateTransactionsState({ month })}
      onQueryChange={(query) => updateTransactionsState({ query })}
      onTypeChange={(type) => updateTransactionsState({ type })}
      onCategoryChange={(categoryId) => updateTransactionsState({ categoryId })}
      onAccountChange={(accountId) => updateTransactionsState({ accountId })}
    />
  );
}

/** `createIntentToken`/`onCreateIntentHandled` for a desktop page reached via a `?create=`
 * URL token (the command palette's "New account/budget/subscription" actions). */
function useCreateIntent(path: "/accounts" | "/budgets" | "/subscriptions") {
  const location = useLocation();
  const navigate = useNavigate();
  const { create } = validateCreateIntentSearch(location.search as Record<string, unknown>);

  return {
    createIntentToken: create,
    onCreateIntentHandled: () => navigate({ to: path, search: {}, replace: true }),
  };
}

export function BudgetsPage() {
  const isDesktop = useIsDesktop();
  const createIntent = useCreateIntent("/budgets");

  return isDesktop ? <DesktopBudgets {...createIntent} /> : <MobileBudgets />;
}

export function SubscriptionsPage() {
  const isDesktop = useIsDesktop();
  const createIntent = useCreateIntent("/subscriptions");

  return isDesktop ? <DesktopSubscriptions {...createIntent} /> : <MobileSubscriptions />;
}

export function AccountsPage() {
  const isDesktop = useIsDesktop();
  const createIntent = useCreateIntent("/accounts");
  const navigation = useAppNavigation();

  return isDesktop ? (
    <DesktopAccounts
      {...createIntent}
      onViewTransactions={(accountId) => navigation.goTransactions({ accountId })}
    />
  ) : (
    <MobileAccounts />
  );
}

export function ReportsPage() {
  return <ReportsShell />;
}

export function SettingsPage() {
  const isDesktop = useIsDesktop();

  return isDesktop ? <DesktopSettings /> : <MobileSettings />;
}

export function SettingsCategoriesPage() {
  const isDesktop = useIsDesktop();

  return <CategoriesPage variant={isDesktop ? "desktop" : "mobile"} />;
}

export function OtherPage() {
  const { t } = useLang();

  const items = [
    {
      to: "/transactions",
      label: t("other.transactions"),
      description: t("other.transactionsDesc"),
      icon: ArrowLeftRight,
    },
    {
      to: "/budgets",
      label: t("other.budgets"),
      description: t("other.budgetsDesc"),
      icon: Target,
    },
    {
      to: "/subscriptions",
      label: t("other.subscriptions"),
      description: t("other.subscriptionsDesc"),
      icon: CalendarClock,
    },
    {
      to: "/settings/categories",
      label: t("other.categories"),
      description: t("other.categoriesDesc"),
      icon: Tags,
    },
    {
      to: "/settings",
      label: t("other.settings"),
      description: t("other.settingsDesc"),
      icon: Settings,
    },
  ] as const;

  return (
    <MobilePageContainer className="gap-6 lg:p-0">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="block">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="flex h-full items-start gap-3 p-5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </MobilePageContainer>
  );
}

export function AppRouteContent({ pathname }: { pathname: string }) {
  const section = sectionFromPath(pathname);

  switch (section) {
    case "reports":
      return <ReportsPage />;
    case "transactions":
      return <TransactionsPage />;
    case "budgets":
      return <BudgetsPage />;
    case "subscriptions":
      return <SubscriptionsPage />;
    case "accounts":
      return <AccountsPage />;
    case "other":
      return <OtherPage />;
    case "settings":
      return <SettingsPage />;
    case "settings-categories":
      return <SettingsCategoriesPage />;
    default:
      return <DashboardPage />;
  }
}

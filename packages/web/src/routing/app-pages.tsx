import { startTransition } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { LowBalanceBanner } from "@/features/subscriptions/components/LowBalanceBanner";
import { SubscriptionDueBanner } from "@/features/subscriptions/components/SubscriptionDueBanner";
import { useTransactionOverlay } from "@/features/transactions/transaction-overlay";
import { MobileAccounts } from "@/features/accounts/components/MobileAccounts";
import { DesktopAccounts } from "@/features/accounts/components/DesktopAccounts";
import { DesktopBudgets } from "@/features/budgets/components/DesktopBudgets";
import { MobileBudgets } from "@/features/budgets/components/MobileBudgets";
import { CategoriesPage } from "@/features/categories/components/CategoriesPage";
import { DesktopDashboard } from "@/features/dashboard/components/DesktopDashboard";
import { MobileHome } from "@/features/dashboard/components/MobileHome";
import { MobilePlanningOverview } from "@/features/dashboard/components/MobilePlanningOverview";
import { MobilePositionOverview } from "@/features/dashboard/components/MobilePositionOverview";
import { DesktopSettings } from "@/features/settings/components/Settings";
import { MobileSettings } from "@/features/settings/components/MobileSettings";
import { DesktopSubscriptions } from "@/features/subscriptions/components/DesktopSubscriptions";
import { MobileSubscriptions } from "@/features/subscriptions/components/MobileSubscriptions";
import { LoansPage as LoansWorkspace } from "@/features/loans/components/LoansPage";
import { ReportsPage as ReportsShell } from "@/features/reports/components/ReportsPage";
import { DesktopTransactionsTable } from "@/features/transactions/components/DesktopTransactionsTable";
import { MobileTransactions } from "@/features/transactions/components/MobileTransactions";
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
    goReports: () => navigate({ to: "/reports" }),
    goTransactions: (search?: Record<string, string | undefined>) =>
      navigate({ to: "/transactions", search }),
    goBudgets: () => navigate({ to: "/budgets" }),
    goSubscriptions: () => navigate({ to: "/subscriptions" }),
    goAccounts: () => navigate({ to: "/accounts" }),
    goLoans: (loanId?: string) =>
      loanId ? navigate({ to: "/loans/$loanId", params: { loanId } }) : navigate({ to: "/loans" }),
    goSettings: () => navigate({ to: "/settings" }),
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
          else if (section === "loans") navigation.goLoans();
          else if (section === "reports") navigation.goReports();
        }}
        onEdit={openEdit}
        onOpenLoan={(loanId) => navigation.goLoans(loanId)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <LowBalanceBanner />
      <SubscriptionDueBanner confirmVariant="sheet" />
      <MobileHome
        onNavigate={(section, search) => {
          if (section === "budgets") navigation.goBudgets();
          else if (section === "subscriptions") navigation.goSubscriptions();
          else if (section === "accounts") navigation.goAccounts();
          else if (section === "transactions") navigation.goTransactions(search);
          else if (section === "loans") navigation.goLoans();
          else if (section === "reports") navigation.goReports();
        }}
        onEdit={openEdit}
        onOpenLoan={(loanId) => navigation.goLoans(loanId)}
      />
    </div>
  );
}

export function TransactionsPage() {
  const isDesktop = useIsDesktop();
  const navigation = useAppNavigation();
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
      onOpenLoan={(loanId) => navigation.goLoans(loanId)}
      month={state.month}
      query={state.query}
      type={state.type}
      categoryIds={state.categoryIds}
      accountIds={state.accountIds}
      onMonthChange={(month) => updateTransactionsState({ month })}
      onQueryChange={(query) => updateTransactionsState({ query })}
      onTypeChange={(type) => updateTransactionsState({ type })}
      onCategoryChange={(categoryIds) => updateTransactionsState({ categoryIds })}
      onAccountChange={(accountIds) => updateTransactionsState({ accountIds })}
      shouldFocusSearch={shouldFocusSearch}
      onSearchFocusHandled={() =>
        navigate({ to: "/transactions", search: buildTransactionsSearch(state), replace: true })
      }
    />
  ) : (
    <MobileTransactions
      onEdit={openEdit}
      onOpenLoan={(loanId) => navigation.goLoans(loanId)}
      month={state.month}
      query={state.query}
      type={state.type}
      categoryIds={state.categoryIds}
      accountIds={state.accountIds}
      onMonthChange={(month) => updateTransactionsState({ month })}
      onQueryChange={(query) => updateTransactionsState({ query })}
      onTypeChange={(type) => updateTransactionsState({ type })}
      onCategoryChange={(categoryIds) => updateTransactionsState({ categoryIds })}
      onAccountChange={(accountIds) => updateTransactionsState({ accountIds })}
    />
  );
}

/** `createIntentToken`/`onCreateIntentHandled` for a desktop page reached via a `?create=`
 * URL token (the command palette's "New account/budget/subscription" actions). */
function useCreateIntent(path: "/accounts" | "/budgets" | "/subscriptions" | "/loans") {
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

export function LoansPage({ loanId }: { loanId?: string }) {
  const createIntent = useCreateIntent("/loans");
  const navigation = useAppNavigation();

  return (
    <LoansWorkspace
      loanId={loanId}
      {...createIntent}
      onLoanIdChange={(nextLoanId) => navigation.goLoans(nextLoanId ?? undefined)}
    />
  );
}

export function ReportsPage() {
  return <ReportsShell />;
}

export function PlanningPage() {
  return <MobilePlanningOverview />;
}

export function PositionPage() {
  return <MobilePositionOverview />;
}

export function SettingsPage() {
  const isDesktop = useIsDesktop();

  return isDesktop ? <DesktopSettings /> : <MobileSettings />;
}

export function SettingsCategoriesPage() {
  const isDesktop = useIsDesktop();

  return <CategoriesPage variant={isDesktop ? "desktop" : "mobile"} />;
}

export function AppRouteContent({ pathname }: { pathname: string }) {
  const section = sectionFromPath(pathname);

  switch (section) {
    case "reports":
      return <ReportsPage />;
    case "transactions":
      return <TransactionsPage />;
    case "planning":
      return <PlanningPage />;
    case "budgets":
      return <BudgetsPage />;
    case "subscriptions":
      return <SubscriptionsPage />;
    case "position":
      return <PositionPage />;
    case "accounts":
      return <AccountsPage />;
    case "loans":
      return <LoansPage />;
    case "settings":
      return <SettingsPage />;
    case "settings-categories":
      return <SettingsCategoriesPage />;
    default:
      return <DashboardPage />;
  }
}

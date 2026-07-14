import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import {
  AccountsPage,
  BudgetsPage,
  DashboardPage,
  OtherPage,
  LoansPage,
  ReportsPage,
  SettingsCategoriesPage,
  SettingsPage,
  SubscriptionsPage,
  TransactionsPage,
} from "@/routing/app-pages";
import { LoadingScreen } from "@/shared/components/LoadingScreen";
import { ResponsiveApp } from "@/layouts/ResponsiveApp";
import { VersionPage } from "@/features/version/components/VersionPage";
import { useAuth, type AuthContextValue } from "@/features/auth/auth";
import { ForgotPasswordPage } from "@/features/auth/components/ForgotPassword";
import { ResetPasswordPage } from "@/features/auth/components/ResetPassword";
import { SignIn } from "@/features/auth/components/SignIn";
import { SignUpPage } from "@/features/auth/components/SignUp";
import { currentRedirectPath, normalizeRedirectPath, validateAuthSearch } from "./auth-redirect";
import { validateCreateIntentSearch } from "./create-intent";
import { validateReportsSearch } from "./reports-search";

type RouterContext = {
  auth: AuthContextValue;
};

function RootRouteComponent() {
  return <Outlet />;
}

function AuthRouteComponent() {
  return <Outlet />;
}

function ProtectedAppRouteComponent() {
  const auth = useAuth();

  if (auth.loading) return <LoadingScreen />;

  if (!auth.user) {
    return <Navigate to="/auth/sign-in" search={{ redirect: currentRedirectPath() }} replace />;
  }

  return <ResponsiveApp />;
}

function EmptyRouteComponent() {
  return null;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootRouteComponent,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthRouteComponent,
});

const signInRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "sign-in",
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context, search }) => {
    if (!context.auth.loading && context.auth.user) {
      throw redirect({
        href: normalizeRedirectPath(search.redirect),
        replace: true,
      });
    }
  },
  component: () => <SignIn redirectTo={normalizeRedirectPath(signInRoute.useSearch().redirect)} />,
});

const signUpRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "sign-up",
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context, search }) => {
    if (!context.auth.loading && context.auth.user) {
      throw redirect({
        href: normalizeRedirectPath(search.redirect),
        replace: true,
      });
    }
  },
  component: () => (
    <SignUpPage redirectTo={normalizeRedirectPath(signUpRoute.useSearch().redirect)} />
  ),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "forgot-password",
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context, search }) => {
    if (!context.auth.loading && context.auth.user) {
      throw redirect({
        href: normalizeRedirectPath(search.redirect),
        replace: true,
      });
    }
  },
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: "reset-password",
  validateSearch: validateAuthSearch,
  component: () => (
    <ResetPasswordPage
      redirectTo={normalizeRedirectPath(resetPasswordRoute.useSearch().redirect)}
    />
  ),
});

const versionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/version",
  component: VersionPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: ({ context, location }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: "/auth/sign-in",
        search: { redirect: normalizeRedirectPath(location.href) },
        replace: true,
      });
    }
  },
  component: ProtectedAppRouteComponent,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: DashboardPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "transactions",
  component: TransactionsPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "reports",
  validateSearch: validateReportsSearch,
  component: ReportsPage,
});

const budgetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "budgets",
  validateSearch: validateCreateIntentSearch,
  component: BudgetsPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "subscriptions",
  validateSearch: validateCreateIntentSearch,
  component: SubscriptionsPage,
});

const accountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "accounts",
  validateSearch: validateCreateIntentSearch,
  component: AccountsPage,
});

const loansRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "loans",
  validateSearch: validateCreateIntentSearch,
  component: LoansPage,
});

const loanDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "loans/$loanId",
  component: () => <LoansPage loanId={loanDetailRoute.useParams().loanId} />,
});

const otherRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "other",
  component: OtherPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "settings",
  component: SettingsPage,
});

const settingsCategoriesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "settings/categories",
  component: SettingsCategoriesPage,
});

const planningRedirectRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "planning",
  beforeLoad: () => {
    throw redirect({
      to: "/budgets",
      replace: true,
    });
  },
  component: EmptyRouteComponent,
});

const routeTree = rootRoute.addChildren([
  versionRoute,
  authRoute.addChildren([signInRoute, signUpRoute, forgotPasswordRoute, resetPasswordRoute]),
  appRoute.addChildren([
    dashboardRoute,
    transactionsRoute,
    reportsRoute,
    budgetsRoute,
    subscriptionsRoute,
    accountsRoute,
    loansRoute,
    loanDetailRoute,
    otherRoute,
    settingsRoute,
    settingsCategoriesRoute,
    planningRedirectRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined as never,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  const auth = useAuth();

  return <RouterProvider router={router} context={{ auth }} />;
}

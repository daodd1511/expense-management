import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import {
  AccountsPage,
  BudgetsPage,
  DashboardPage,
  SettingsCategoriesPage,
  SettingsPage,
  SubscriptionsPage,
  TransactionsPage,
} from '@/routing/app-pages'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { ResponsiveApp } from '@/layouts/ResponsiveApp'
import { useAuth, type AuthContextValue } from '@/features/auth/auth'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPassword'
import { ResetPasswordPage } from '@/features/auth/components/ResetPassword'
import { SignIn } from '@/features/auth/components/SignIn'
import { SignUpPage } from '@/features/auth/components/SignUp'
import { currentRedirectPath, normalizeRedirectPath, validateAuthSearch } from './auth-redirect'
import { validateTransactionOverlaySearch } from './transaction-overlay'

type RouterContext = {
  auth: AuthContextValue
}

function RootRouteComponent() {
  return <Outlet />
}

function AuthRouteComponent() {
  return <Outlet />
}

function ProtectedAppRouteComponent() {
  const auth = useAuth()

  if (auth.loading) return <LoadingScreen />

  if (!auth.user) {
    return (
      <Navigate
        to="/auth/sign-in"
        search={{ redirect: currentRedirectPath() }}
        replace
      />
    )
  }

  return <ResponsiveApp />
}

function EmptyRouteComponent() {
  return null
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootRouteComponent,
})

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthRouteComponent,
})

const signInRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sign-in',
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context, search }) => {
    if (!context.auth.loading && context.auth.user) {
      throw redirect({
        href: normalizeRedirectPath(search.redirect),
        replace: true,
      })
    }
  },
  component: () => <SignIn redirectTo={normalizeRedirectPath(signInRoute.useSearch().redirect)} />,
})

const signUpRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sign-up',
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context, search }) => {
    if (!context.auth.loading && context.auth.user) {
      throw redirect({
        href: normalizeRedirectPath(search.redirect),
        replace: true,
      })
    }
  },
  component: () => <SignUpPage redirectTo={normalizeRedirectPath(signUpRoute.useSearch().redirect)} />,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'forgot-password',
  validateSearch: validateAuthSearch,
  beforeLoad: ({ context, search }) => {
    if (!context.auth.loading && context.auth.user) {
      throw redirect({
        href: normalizeRedirectPath(search.redirect),
        replace: true,
      })
    }
  },
  component: ForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'reset-password',
  validateSearch: validateAuthSearch,
  component: () => (
    <ResetPasswordPage redirectTo={normalizeRedirectPath(resetPasswordRoute.useSearch().redirect)} />
  ),
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  path: '/',
  beforeLoad: ({ context, location }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: '/auth/sign-in',
        search: { redirect: normalizeRedirectPath(location.href) },
        replace: true,
      })
    }
  },
  component: ProtectedAppRouteComponent,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: DashboardPage,
})

const transactionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'transactions',
  component: TransactionsPage,
})

const transactionCreateRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'transactions/new',
  validateSearch: validateTransactionOverlaySearch,
  component: EmptyRouteComponent,
})

const transactionEditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'transactions/$transactionId/edit',
  validateSearch: validateTransactionOverlaySearch,
  component: EmptyRouteComponent,
})

const budgetsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'budgets',
  component: BudgetsPage,
})

const subscriptionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'subscriptions',
  component: SubscriptionsPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'accounts',
  component: AccountsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'settings',
  component: SettingsPage,
})

const settingsCategoriesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'settings/categories',
  component: SettingsCategoriesPage,
})

const planningRedirectRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'planning',
  beforeLoad: () => {
    throw redirect({
      to: '/budgets',
      replace: true,
    })
  },
  component: EmptyRouteComponent,
})

const routeTree = rootRoute.addChildren([
  authRoute.addChildren([
    signInRoute,
    signUpRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
  ]),
  appRoute.addChildren([
    dashboardRoute,
    transactionsRoute,
    transactionCreateRoute,
    transactionEditRoute,
    budgetsRoute,
    subscriptionsRoute,
    accountsRoute,
    settingsRoute,
    settingsCategoriesRoute,
    planningRedirectRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined as never,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  const auth = useAuth()

  return <RouterProvider router={router} context={{ auth }} />
}

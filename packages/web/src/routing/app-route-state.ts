export type AppSection =
  | 'dashboard'
  | 'reports'
  | 'transactions'
  | 'budgets'
  | 'subscriptions'
  | 'accounts'
  | 'other'
  | 'settings'
  | 'settings-categories'

export function sectionFromPath(pathname: string): AppSection {
  if (pathname === '/reports' || pathname.startsWith('/reports/')) return 'reports'
  if (pathname === '/transactions' || pathname.startsWith('/transactions/')) return 'transactions'
  if (pathname === '/budgets' || pathname.startsWith('/budgets/')) return 'budgets'
  if (pathname === '/subscriptions' || pathname.startsWith('/subscriptions/')) return 'subscriptions'
  if (pathname === '/accounts' || pathname.startsWith('/accounts/')) return 'accounts'
  if (pathname === '/other' || pathname.startsWith('/other/')) return 'other'
  if (pathname === '/settings/categories' || pathname.startsWith('/settings/categories/')) return 'settings-categories'
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'settings'
  return 'dashboard'
}

export function isSettingsSection(section: AppSection) {
  return section === 'settings' || section === 'settings-categories'
}

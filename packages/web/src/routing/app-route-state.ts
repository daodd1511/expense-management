export type AppSection =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'subscriptions'
  | 'accounts'
  | 'settings'
  | 'settings-categories'

export function sectionFromPath(pathname: string): AppSection {
  if (pathname === '/transactions' || pathname.startsWith('/transactions/')) return 'transactions'
  if (pathname === '/budgets' || pathname.startsWith('/budgets/')) return 'budgets'
  if (pathname === '/subscriptions' || pathname.startsWith('/subscriptions/')) return 'subscriptions'
  if (pathname === '/accounts' || pathname.startsWith('/accounts/')) return 'accounts'
  if (pathname === '/settings/categories' || pathname.startsWith('/settings/categories/')) return 'settings-categories'
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'settings'
  return 'dashboard'
}

export function isPlanningSection(section: AppSection) {
  return section === 'budgets' || section === 'subscriptions'
}

export function isSettingsSection(section: AppSection) {
  return section === 'settings' || section === 'settings-categories'
}

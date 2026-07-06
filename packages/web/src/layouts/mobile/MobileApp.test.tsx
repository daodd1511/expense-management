import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MobileApp } from './MobileApp'

const navigate = vi.fn()
const quickAddSheet = vi.fn<(props: {
  open: boolean
  returnTo: string
  onClose: () => void
}) => null>(() => null)

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div>outlet</div>,
  useLocation: () => ({
    pathname: '/',
    search: {},
    href: '/?month=2026-07',
  }),
  useNavigate: () => navigate,
}))

vi.mock('@/features/transactions/components/TransactionRouteOverlay', () => ({
  TransactionRouteOverlay: () => null,
}))

vi.mock('@/features/transactions/components/MobileQuickAddTransactionSheet', () => ({
  MobileQuickAddTransactionSheet: (props: {
    open: boolean
    returnTo: string
    onClose: () => void
  }) => {
    quickAddSheet(props)
    return props.open ? <div data-testid="quick-add-sheet" /> : null
  },
}))

vi.mock('@/shared/components/LoadingScreen', () => ({
  LoadingScreen: () => <div>loading</div>,
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        'nav.home': 'Home',
        'nav.transactions': 'Transactions',
        'nav.planning': 'Planning',
        'nav.accounts': 'Accounts',
        'nav.settings': 'Settings',
        'nav.dashboard': 'Dashboard',
        'app.addTransaction': 'Add transaction',
      })[key] ?? key,
  }),
}))

vi.mock('@/routing/app-pages', () => ({
  AppRouteContent: () => <div>route-content</div>,
}))

vi.mock('@/features/transactions/queries', () => ({
  useTransactions: () => ({ data: [] }),
}))

vi.mock('@/features/subscriptions/queries', () => ({
  useSubscriptions: () => ({ data: [] }),
}))

vi.mock('@/shared/hooks/useAppDataLoading', () => ({
  useAppDataLoading: () => false,
}))

vi.mock('@/features/subscriptions/helpers', () => ({
  dueBanner: () => [],
}))

describe('MobileApp', () => {
  it('opens the quick-add sheet without routing to /transactions/new', async () => {
    const user = userEvent.setup()
    quickAddSheet.mockClear()
    navigate.mockReset()

    render(<MobileApp />)

    await user.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(screen.getByTestId('quick-add-sheet')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/transactions/new' }),
    )
    expect(quickAddSheet.mock.calls.at(-1)?.[0]).toMatchObject({
      open: true,
      returnTo: '/?month=2026-07',
    })
  })
})

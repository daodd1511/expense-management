import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MobileApp } from './MobileApp'

const navigate = vi.fn()
const openCreate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div>outlet</div>,
  useLocation: () => ({
    pathname: '/',
    search: {},
    href: '/?month=2026-07',
  }),
  useNavigate: () => navigate,
}))

vi.mock('@/features/transactions/transaction-overlay', () => ({
  useTransactionOverlay: () => ({ openCreate, openEdit: vi.fn(), close: vi.fn() }),
  TransactionOverlaySheet: () => null,
}))

vi.mock('@/shared/components/LoadingScreen', () => ({
  LoadingScreen: () => <div>loading</div>,
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        'nav.home': 'Home',
        'nav.accounts': 'Accounts',
        'nav.reports': 'Reports',
        'nav.other': 'Other',
        'nav.settings': 'Settings',
        'nav.dashboard': 'Dashboard',
        'app.addTransaction': 'Add transaction',
      })[key] ?? key,
  }),
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
  it('opens the transaction overlay without routing to /transactions/new', async () => {
    const user = userEvent.setup()
    openCreate.mockClear()
    navigate.mockReset()

    render(<MobileApp />)

    const home = screen.getByRole('button', { name: 'Home' })
    const accounts = screen.getByRole('button', { name: 'Accounts' })
    const reports = screen.getByRole('button', { name: 'Reports' })
    const other = screen.getByRole('button', { name: 'Other' })

    expect(home.compareDocumentPosition(accounts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(accounts.compareDocumentPosition(reports) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(reports.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(openCreate).toHaveBeenCalledWith('2026-07')
    expect(navigate).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: '/transactions/new' }),
    )
  })
})

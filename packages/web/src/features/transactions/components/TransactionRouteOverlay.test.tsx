import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Transaction } from '@/core/types'
import { TransactionRouteOverlay } from './TransactionRouteOverlay'

const navigate = vi.fn()
const addMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()

let mockTransactions: Transaction[] = []

const submittedTransaction: Omit<Transaction, 'id'> = {
  type: 'expense',
  amount: 125000,
  categoryId: 'food',
  accountId: 'cash',
  toAccountId: null,
  merchant: 'Food',
  note: 'Lunch',
  date: '2026-07-05',
  receipt: null,
  subscriptionId: undefined,
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        'form.addTitle': 'Add transaction',
        'form.editTitle': 'Edit transaction',
      })[key] ?? key,
  }),
}))

vi.mock('@/shared/components/ui/overlay', () => ({
  BottomSheet: ({
    open,
    children,
  }: {
    open: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
  }) => (open ? <div data-testid="bottom-sheet">{children}</div> : null),
  Drawer: ({
    open,
    children,
  }: {
    open: boolean
    onClose: () => void
    children: React.ReactNode
  }) => (open ? <div data-testid="drawer">{children}</div> : null),
}))

vi.mock('@/features/transactions/queries', () => ({
  useTransactions: () => ({ data: mockTransactions }),
  useAddTransaction: () => ({ mutateAsync: addMutateAsync }),
  useUpdateTransaction: () => ({ mutateAsync: updateMutateAsync }),
}))

vi.mock('./TransactionForm', () => ({
  TransactionForm: ({
    initial,
    onCancel,
    onSubmit,
  }: {
    variant: 'mobile' | 'desktop'
    initial?: Transaction
    onCancel: () => void
    onSubmit: (transaction: Omit<Transaction, 'id'>) => Promise<void>
  }) => (
    <div>
      <div data-testid="transaction-form">{initial?.id ?? 'new'}</div>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" onClick={() => void onSubmit(submittedTransaction)}>
        Submit
      </button>
    </div>
  ),
}))

describe('TransactionRouteOverlay', () => {
  beforeEach(() => {
    mockTransactions = []
    navigate.mockReset()
    addMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    addMutateAsync.mockResolvedValue(undefined)
    updateMutateAsync.mockResolvedValue(undefined)
  })

  it('closes create overlays by replacing back to the return route', async () => {
    const user = userEvent.setup()

    render(
      <TransactionRouteOverlay
        variant="mobile"
        overlay={{ mode: 'create', returnTo: '/accounts', returnToPathname: '/accounts' }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(navigate).toHaveBeenCalledWith({ href: '/accounts', replace: true })
  })

  it('submits edit overlays against the existing transaction and then closes', async () => {
    const user = userEvent.setup()
    mockTransactions = [
      {
        id: 'tx-1',
        ...submittedTransaction,
      },
    ]

    render(
      <TransactionRouteOverlay
        variant="desktop"
        overlay={{ mode: 'edit', transactionId: 'tx-1', returnTo: '/', returnToPathname: '/' }}
      />,
    )

    expect(screen.getByTestId('transaction-form').textContent).toBe('tx-1')

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'tx-1',
      patch: submittedTransaction,
    })
    expect(navigate).toHaveBeenCalledWith({ href: '/', replace: true })
  })

  it('redirects a missing edit transaction back to the return route', async () => {
    render(
      <TransactionRouteOverlay
        variant="desktop"
        overlay={{ mode: 'edit', transactionId: 'missing', returnTo: '/transactions', returnToPathname: '/transactions' }}
      />,
    )

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ href: '/transactions', replace: true })
    })
  })
})

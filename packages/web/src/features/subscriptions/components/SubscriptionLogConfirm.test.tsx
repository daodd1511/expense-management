import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SubscriptionLogConfirm } from './SubscriptionLogConfirm'

vi.mock('@/features/categories/queries', () => ({
  useCategoryLookup: () => (id: string | null | undefined) =>
    id === 'cat-1' ? { id: 'cat-1', name: 'Housing' } : undefined,
}))

vi.mock('@/features/accounts/queries', () => ({
  useAccountLookup: () => (id: string | null | undefined) =>
    id === 'acc-1' ? { id: 'acc-1', name: 'Checking' } : undefined,
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      ({
        'sub.logConfirmTitle': 'Confirm subscription payment',
        'sub.logConfirmMessage': `This will create a new transaction for ${vars?.name}.`,
        'form.category': 'Category',
        'form.account': 'Account',
        'form.date': 'Date',
        'sub.logConfirmAmount': 'Amount',
        'form.cancel': 'Cancel',
        'sub.logConfirmAction': 'Confirm payment',
        'sub.loggingPayment': 'Logging payment...',
      })[key] ?? key,
  }),
}))

describe('SubscriptionLogConfirm', () => {
  const subscription = {
    id: 'sub-1',
    name: 'Netflix',
    amount: 249000,
    type: 'expense',
    categoryId: 'cat-1',
    accountId: 'acc-1',
    cadence: 'monthly',
    dayOfMonth: 5,
    monthOfYear: 1,
    nextDueDate: '2026-07-05',
    note: undefined,
    active: true,
  } as const

  it('renders the payment preview fields before confirming', () => {
    render(
      <SubscriptionLogConfirm
        open
        subscription={subscription}
        transactionDate="2026-07-05"
        variant="modal"
        isSubmitting={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('Confirm subscription payment')).toBeDefined()
    expect(screen.getByText('Housing')).toBeDefined()
    expect(screen.getByText('Checking')).toBeDefined()
    expect(screen.getByText('05/07/2026')).toBeDefined()
    expect(screen.getByText('249.000 ₫')).toBeDefined()
  })

  it('shows the confirm-button loading state while submission is pending', () => {
    render(
      <SubscriptionLogConfirm
        open
        subscription={subscription}
        transactionDate="2026-07-05"
        variant="modal"
        isSubmitting
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Logging payment...' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
  })
})

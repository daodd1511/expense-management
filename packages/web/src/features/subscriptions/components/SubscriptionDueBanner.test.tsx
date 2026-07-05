import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SubscriptionDueBanner } from './SubscriptionDueBanner'

const logSubscriptionMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/subscriptions/queries', () => ({
  useSubscriptions: () => ({
    data: [{
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
      note: null,
      active: true,
    }],
  }),
  useLogSubscription: () => ({
    mutateAsync: logSubscriptionMock,
    isPending: false,
  }),
}))

vi.mock('@/features/transactions/queries', () => ({
  useTransactions: () => ({ data: [] }),
}))

vi.mock('@/features/subscriptions/helpers', () => ({
  dueBanner: (subscriptions: Array<unknown>) => subscriptions,
}))

vi.mock('@/features/categories/queries', () => ({
  useCategoryLookup: () => () => ({ id: 'cat-1', name: 'Housing' }),
}))

vi.mock('@/features/accounts/queries', () => ({
  useAccountLookup: () => () => ({ id: 'acc-1', name: 'Checking' }),
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      ({
        'sub.bannerSingle': `${vars?.name} is due today`,
        'sub.bannerTitle': `${vars?.n} payments due`,
        'sub.dismiss': 'Dismiss',
        'sub.logNow': 'Log now',
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

describe('SubscriptionDueBanner', () => {
  it('requires confirmation before logging the subscription payment', async () => {
    const user = userEvent.setup()
    logSubscriptionMock.mockResolvedValueOnce(undefined)

    render(<SubscriptionDueBanner />)

    await user.click(screen.getByRole('button', { name: 'Log now' }))

    expect(logSubscriptionMock).not.toHaveBeenCalled()
    expect(screen.getByText('Confirm subscription payment')).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    expect(logSubscriptionMock).toHaveBeenCalledTimes(1)
  })

  it('closes the dialog after a successful confirm', async () => {
    const user = userEvent.setup()
    let resolveLog!: () => void
    logSubscriptionMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveLog = resolve
      }),
    )

    render(<SubscriptionDueBanner />)
    await user.click(screen.getByRole('button', { name: 'Log now' }))
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }))

    await act(async () => {
      resolveLog()
    })

    expect(screen.queryByText('Confirm subscription payment')).toBeNull()
  })
})

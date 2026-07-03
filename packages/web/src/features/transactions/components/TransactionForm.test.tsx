import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionForm } from './TransactionForm'

const MOCK_CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'utensils', color: 'blue', type: 'expense', parentId: null },
  { id: 'salary', name: 'Salary', icon: 'wallet', color: 'green', type: 'income', parentId: null },
]

vi.mock('@/core/store', () => ({
  useStore: () => ({
    categories: MOCK_CATEGORIES,
    // both marked favorite so they appear directly, without needing "Show all"
    favoriteCategoryIds: new Set(['food', 'salary']),
    accounts: [
      { id: 'cash', name: 'Cash' },
      { id: 'bank', name: 'Bank' },
    ],
    getCategory: (id: string | null | undefined) => MOCK_CATEGORIES.find((c) => c.id === id),
  }),
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    lang: 'en',
    t: (key: string) =>
      ({
        'form.expense': 'Expense',
        'form.income': 'Income',
        'form.transfer': 'Transfer',
        'form.merchant': 'Merchant',
        'form.merchantPlaceholder': 'Merchant placeholder',
        'form.note': 'Note',
        'form.notePlaceholder': 'Note placeholder',
        'form.account': 'Account',
        'form.fromAccount': 'From account',
        'form.toAccount': 'To account',
        'form.selectAccount': 'Select account',
        'form.category': 'Category',
        'form.amount': 'Amount',
        'form.date': 'Date',
        'form.addTitle': 'Add transaction',
        'form.editTitle': 'Edit transaction',
        'form.close': 'Close',
        'form.cancel': 'Cancel',
        'form.submit': 'Save',
        'form.save': 'Save',
        'form.defaultTransfer': 'Transfer',
        'form.defaultTx': 'Transaction',
      })[key] ?? key,
  }),
  translate: (key: string) => key,
}))

vi.mock('@/shared/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPopup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPositioner: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children: ReactNode | ((value: string | null) => ReactNode) }) =>
    <div>{typeof children === 'function' ? children('cash') : children}</div>,
}))

vi.mock('@/shared/components/ui/date-picker', () => ({
  DatePicker: ({ value }: { value: string }) => <input aria-label="Date" readOnly value={value} />,
}))

describe('TransactionForm', () => {
  it('submits a date-only ISO string', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <TransactionForm
        variant="desktop"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText('0'), '1213')
    await user.click(screen.getByRole('button', { name: 'Food' }))
    await user.type(screen.getByLabelText('Merchant'), 'AAA')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        amount: 1213,
        categoryId: 'food',
        accountId: 'cash',
        merchant: 'AAA',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )

    const [{ date }] = onSubmit.mock.calls[0]
    expect(date.includes('T')).toBe(false)
  })

  it('filters categories by type, replacing the old hardcoded INCOME_CATS list', async () => {
    const user = userEvent.setup()

    render(
      <TransactionForm
        variant="desktop"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: 'Food' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Salary' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Income' }))

    expect(screen.getByRole('button', { name: 'Salary' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Food' })).toBeNull()
  })

  it('clears the selected category when switching type away from its type', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <TransactionForm
        variant="desktop"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Food' }))
    await user.click(screen.getByRole('button', { name: 'Income' }))
    await user.click(screen.getByRole('button', { name: 'Salary' }))
    await user.type(screen.getByPlaceholderText('0'), '5000')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income', categoryId: 'salary' }),
    )
  })

  it('keeps the form open with input intact and shows an inline banner when onSubmit rejects', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'))

    render(
      <TransactionForm
        variant="desktop"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    )

    await user.type(screen.getByPlaceholderText('0'), '1213')
    await user.click(screen.getByRole('button', { name: 'Food' }))
    await user.type(screen.getByLabelText('Merchant'), 'AAA')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByLabelText('Merchant')).toHaveProperty('value', 'AAA')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined()
  })
})

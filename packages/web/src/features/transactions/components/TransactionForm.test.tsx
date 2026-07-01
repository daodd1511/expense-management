import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionForm } from './TransactionForm'

vi.mock('@/core/store', () => ({
  useStore: () => ({
    categories: [
      { id: 'food', name: 'Food', icon: 'utensils', color: 'blue' },
      { id: 'salary', name: 'Salary', icon: 'wallet', color: 'green' },
    ],
    accounts: [
      { id: 'cash', name: 'Cash' },
      { id: 'bank', name: 'Bank' },
    ],
    getCategory: (id: string | null | undefined) =>
      id === 'food'
        ? { id: 'food', name: 'Food', icon: 'utensils', color: 'blue' }
        : id === 'salary'
          ? { id: 'salary', name: 'Salary', icon: 'wallet', color: 'green' }
          : undefined,
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
    const onSubmit = vi.fn()

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
})

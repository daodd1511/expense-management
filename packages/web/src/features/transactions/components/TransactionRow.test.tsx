import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransactionRow } from './TransactionRow'

const MOCK_CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'utensils', color: 'blue', type: 'expense', parentId: null },
  { id: 'dating', name: 'Dating', icon: 'heart', color: 'pink', type: 'expense', parentId: 'food' },
  { id: 'salary', name: 'Salary', icon: 'wallet', color: 'green', type: 'income', parentId: null },
]

const MOCK_ACCOUNTS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
]

vi.mock('@/core/store', () => ({
  useStore: () => ({
    getCategory: (id: string | null | undefined) => MOCK_CATEGORIES.find((category) => category.id === id),
    getAccount: (id: string | null | undefined) => MOCK_ACCOUNTS.find((account) => account.id === id),
    deleteTransaction: vi.fn(),
  }),
}))

describe('TransactionRow', () => {
  it('shows the parent breadcrumb only for nested categories', () => {
    render(
      <TransactionRow
        tx={{
          id: 'tx-1',
          type: 'expense',
          amount: 150000,
          categoryId: 'dating',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Coffee',
          note: undefined,
          date: '2026-07-05T10:00:00.000Z',
          receipt: null,
          subscriptionId: null,
        }}
      />,
    )

    expect(screen.getByText('Food › Dating · Cash')).toBeDefined()
  })

  it('keeps top-level categories flat', () => {
    render(
      <TransactionRow
        tx={{
          id: 'tx-2',
          type: 'income',
          amount: 5000000,
          categoryId: 'salary',
          accountId: 'bank',
          toAccountId: null,
          merchant: 'Payroll',
          note: undefined,
          date: '2026-07-05T10:00:00.000Z',
          receipt: null,
          subscriptionId: null,
        }}
      />,
    )

    expect(screen.getByText('Salary · Bank')).toBeDefined()
  })

  it('leaves transfer subtitles unchanged', () => {
    render(
      <TransactionRow
        tx={{
          id: 'tx-3',
          type: 'transfer',
          amount: 200000,
          categoryId: null,
          accountId: 'cash',
          toAccountId: 'bank',
          merchant: 'Transfer',
          note: undefined,
          date: '2026-07-05T10:00:00.000Z',
          receipt: null,
          subscriptionId: null,
        }}
      />,
    )

    expect(screen.getByText('Cash → Bank')).toBeDefined()
  })
})

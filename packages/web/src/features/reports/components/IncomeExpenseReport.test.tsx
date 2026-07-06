import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IncomeExpenseReport } from './IncomeExpenseReport'

const openEdit = vi.fn()

var mockedReport = makeReportWithExpenseCategories()

vi.mock('@/features/transactions/transaction-overlay', () => ({
  useTransactionOverlay: () => ({ openEdit, openCreate: vi.fn(), close: vi.fn() }),
}))

vi.mock('@/core/i18n', () => ({
  DATE_LOCALE: {
    vi: {
      months: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
      weekdays: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
    },
    en: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
  },
  useLang: () => ({
    lang: 'en',
    t: (key: string, vars?: Record<string, number | string>) =>
      ({
        'reports.totalIncome': 'Total income',
        'reports.totalExpense': 'Total expense',
        'reports.totalNet': 'Net',
        'reports.transactionCount': 'Transactions',
        'reports.transactionCountValue': `${vars?.n ?? '{n}'} transactions`,
        'reports.expenseDonutCenter': 'Total expense',
        'reports.expenseCategories': 'Spending by category',
        'reports.categoryTransactions': `${vars?.n ?? '{n}'} transactions`,
        'reports.expenseEmptyTitle': 'No expense categories yet',
        'reports.expenseEmptyDesc': 'There are no expense categories in this period.',
      })[key] ?? key,
  }),
}))

vi.mock('@/shared/components/Charts', () => ({
  CategoryDonut: () => <div data-testid="donut" />,
}))

vi.mock('@/shared/components/Skeleton', () => ({
  ReportsSkeleton: () => <div data-testid="reports-skeleton" />,
}))

vi.mock('@/shared/hooks/useIsDesktop', () => ({
  useIsDesktop: () => true,
}))

vi.mock('@/features/categories/queries', () => ({
  useCategoryLookup: () => (id: string) =>
    ({
      'cat-transport': { id: 'cat-transport', name: 'Transport', icon: 'Bus', color: 'chart-1' },
      'cat-food': { id: 'cat-food', name: 'Food', icon: 'Coffee', color: 'chart-2' },
    })[id],
}))

vi.mock('@/features/accounts/queries', () => ({
  useAccounts: () => ({ data: [{ id: 'acc-1', name: 'Cash' }] }),
  useAccountLookup: () => (id: string) =>
    ({
      'acc-1': { id: 'acc-1', name: 'Cash' },
    })[id],
}))

vi.mock('@/features/reports/queries', () => ({
  useIncomeExpenseReport: () => ({
    isPending: false,
    data: mockedReport,
  }),
}))

describe('IncomeExpenseReport', () => {
  beforeEach(() => {
    openEdit.mockReset()
    mockedReport = makeReportWithExpenseCategories()
  })

  it('shows empty state when no expense categories exist', () => {
    mockedReport = {
      data: {
        range: { from: '2026-07-01', to: '2026-07-31', granularity: 'month' },
        totals: { income: 1000, expense: 0, net: 1000, transactionCount: 1 },
        series: [],
        categories: [],
      },
    }

    render(<IncomeExpenseReport month="2026-07" />)

    expect(screen.getByText('No expense categories yet')).toBeTruthy()
  })

  it('sorts categories descending, expands rows, and opens the edit overlay', async () => {
    const user = userEvent.setup()

    render(<IncomeExpenseReport month="2026-07" />)

    const categoryButtons = Array.from(document.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Transport') || button.textContent?.includes('Food'),
    )

    expect(categoryButtons[0]?.textContent).toContain('Transport')
    expect(categoryButtons[1]?.textContent).toContain('Food')

    await user.click(categoryButtons[0]!)
    expect(screen.getByText('Taxi')).toBeTruthy()

    await user.click(screen.getByText('Taxi'))
    expect(openEdit).toHaveBeenCalledWith('tx-transport', '2026-07')
  })
})

function makeReportWithExpenseCategories() {
  return {
    data: {
      range: { from: '2026-07-01', to: '2026-07-31', granularity: 'month' as const },
      totals: { income: 0, expense: 1500, net: -1500, transactionCount: 2 },
      series: [],
      categories: [
        {
          categoryId: 'cat-food',
          parentCategoryId: null,
          type: 'expense' as const,
          amount: 500,
          transactionCount: 1,
          percentage: 0.3333333333333333,
          transactions: [
            {
              id: 'tx-food',
              date: '2026-07-08',
              merchant: 'Coffee Shop',
              note: 'Lunch',
              amount: 500,
              accountId: 'acc-1',
            },
          ],
        },
        {
          categoryId: 'cat-transport',
          parentCategoryId: null,
          type: 'expense' as const,
          amount: 1000,
          transactionCount: 1,
          percentage: 0.6666666666666666,
          transactions: [
            {
              id: 'tx-transport',
              date: '2026-07-12',
              merchant: 'Taxi',
              note: 'Airport',
              amount: 1000,
              accountId: 'acc-1',
            },
          ],
        },
      ],
    },
  }
}

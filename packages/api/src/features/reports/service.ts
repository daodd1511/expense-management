import {
  incomeExpenseReportResponseSchema,
  type IncomeExpenseReportResponse,
  type ReportCategoryAggregate,
  type ReportTransactionRow,
} from '@wallet/shared'
import { ApiError } from '../../middleware/error'
import * as repository from './repository'

function monthKey(date: string) {
  return date.slice(0, 7)
}

function monthRange(from: string, to: string) {
  const [startYear, startMonth] = from.split('-').map(Number)
  const [endYear, endMonth] = to.split('-').map(Number)
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1))
  const last = new Date(Date.UTC(endYear, endMonth - 1, 1))
  const months: string[] = []

  while (cursor <= last) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

function sortCategoryTransactions(transactions: ReportTransactionRow[]) {
  return [...transactions].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date)
    if (dateOrder !== 0) return dateOrder
    return left.merchant.localeCompare(right.merchant)
  })
}

function percentageOf(amount: number, total: number) {
  if (total === 0) return 0
  return amount / total
}

export async function getIncomeExpenseReport(userId: string, from: string, to: string): Promise<IncomeExpenseReportResponse> {
  const transactions = await repository.listReportTransactions(userId, from, to)
  const reportableTransactions = transactions.filter((transaction) => transaction.type !== 'transfer')
  const categoryIds = [
    ...new Set(reportableTransactions.map((transaction) => transaction.categoryId).filter((id): id is string => Boolean(id))),
  ]
  const categories = await repository.listReportCategories(userId, categoryIds)
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const periods = monthRange(from.slice(0, 7), to.slice(0, 7))

  const totals = {
    income: 0,
    expense: 0,
    net: 0,
    transactionCount: 0,
  }

  const series = new Map(
    periods.map((period) => [
      period,
      {
        period,
        income: 0,
        expense: 0,
        net: 0,
      },
    ]),
  )

  type CategoryDraft = Omit<ReportCategoryAggregate, 'percentage'> & { transactions: ReportTransactionRow[] }

  const categoryGroups = new Map<string, CategoryDraft>()

  for (const transaction of reportableTransactions) {
    const hiddenCategory = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined
    if (hiddenCategory?.isHidden && hiddenCategory.name === 'Balance Adjustment') {
      continue
    }

    totals.transactionCount += 1

    if (transaction.type === 'income') {
      totals.income += transaction.amount
    } else {
      totals.expense += transaction.amount
    }

    const period = monthKey(transaction.date)
    const seriesPoint = series.get(period)
    if (seriesPoint) {
      if (transaction.type === 'income') {
        seriesPoint.income += transaction.amount
      } else {
        seriesPoint.expense += transaction.amount
      }
      seriesPoint.net = seriesPoint.income - seriesPoint.expense
    }

    if (!transaction.categoryId) {
      continue
    }

    const category = categoryById.get(transaction.categoryId)
    const type = category?.type ?? (transaction.type === 'income' ? 'income' : 'expense')
    const key = `${type}:${transaction.categoryId}`
    const group =
      categoryGroups.get(key) ??
      (() => {
        const nextGroup: CategoryDraft = {
          categoryId: transaction.categoryId,
          parentCategoryId: category?.parentId ?? null,
          type,
          amount: 0,
          transactionCount: 0,
          transactions: [],
        }
        categoryGroups.set(key, nextGroup)
        return nextGroup
      })()

    group.amount += transaction.amount
    group.transactionCount += 1
    group.transactions.push({
      id: transaction.id,
      date: transaction.date,
      merchant: transaction.merchant,
      note: transaction.note,
      amount: transaction.amount,
      accountId: transaction.accountId,
    })
  }

  totals.net = totals.income - totals.expense

  const categorySummaries = [...categoryGroups.values()]
    .map((group) => {
      const typeTotal = group.type === 'income' ? totals.income : totals.expense
      return {
        categoryId: group.categoryId,
        parentCategoryId: group.parentCategoryId,
        type: group.type,
        amount: group.amount,
        transactionCount: group.transactionCount,
        percentage: percentageOf(group.amount, typeTotal),
        transactions: sortCategoryTransactions(group.transactions),
      }
    })
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'expense' ? -1 : 1
      }
      if (right.amount !== left.amount) {
        return right.amount - left.amount
      }
      return left.categoryId.localeCompare(right.categoryId)
    })

  const response = incomeExpenseReportResponseSchema.safeParse({
    data: {
      range: {
        from,
        to,
        granularity: 'month',
      },
      totals,
      series: periods.map((period) => {
        const seriesPoint = series.get(period)
        if (!seriesPoint) {
          throw new ApiError(500, 'Report series failed validation')
        }

        return seriesPoint
      }),
      categories: categorySummaries,
    },
  })

  if (!response.success) {
    throw new ApiError(500, 'Income vs expense report failed validation', response.error.flatten())
  }

  return response.data
}

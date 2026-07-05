import { monthlyTotalsResponseSchema, type MonthlyTotal } from '@wallet/shared'
import { apiJson } from '@/core/api'

export async function fetchMonthlyTotals(): Promise<MonthlyTotal[]> {
  const response = await apiJson('/analytics/monthly-totals', monthlyTotalsResponseSchema)
  return response.data
}

import { balanceTrendResponseSchema, type BalanceTrendPoint } from '@wallet/shared'
import { apiJson } from '@/core/api'

export async function fetchBalanceTrend(referenceMonth: string): Promise<BalanceTrendPoint[]> {
  const response = await apiJson(
    `/analytics/balance-trend?referenceMonth=${encodeURIComponent(referenceMonth)}`,
    balanceTrendResponseSchema,
  )
  return response.data
}

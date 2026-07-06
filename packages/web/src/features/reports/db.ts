import { apiJson } from '@/core/api'
import { incomeExpenseReportResponseSchema } from '@wallet/shared'
import type { IncomeExpenseReportResponse } from '@wallet/shared'

export async function fetchIncomeExpenseReport(params: {
  from: string
  to: string
}): Promise<IncomeExpenseReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
  })

  return apiJson(`/reports/income-expense?${search.toString()}`, incomeExpenseReportResponseSchema)
}

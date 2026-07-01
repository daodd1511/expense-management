import { colorVar } from '@/shared/components/CategoryIcon'
import type { DonutDatum } from '@/shared/components/Charts'
import { expenseByCategory } from '@/core/store'
import type { Category, Transaction } from '@/core/types'

export function buildDonutData(
  transactions: Transaction[],
  getCategory: (id: string | null | undefined) => Category | undefined,
): { data: DonutDatum[]; total: number } {
  const map = expenseByCategory(transactions)
  const data: DonutDatum[] = [...map.entries()]
    .map(([catId, value]) => {
      const cat = getCategory(catId)
      return { name: cat?.name ?? 'Khác', value, color: colorVar(cat?.color ?? 'chart-1') }
    })
    .sort((a, b) => b.value - a.value)
  const total = data.reduce((s, d) => s + d.value, 0)
  return { data, total }
}

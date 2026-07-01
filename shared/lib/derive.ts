import { colorVar } from '@/components/category-icon'
import type { DonutDatum } from '@/components/charts'
import { expenseByCategory } from './store'
import type { Category, Transaction } from './types'

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

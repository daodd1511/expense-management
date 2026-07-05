import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import { fetchMonthlyTotals } from '@/features/dashboard/db'

export function useMonthlyTotals() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'monthly-totals', user?.id],
    queryFn: fetchMonthlyTotals,
    enabled: !!user,
  })
}

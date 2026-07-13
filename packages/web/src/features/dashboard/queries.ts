import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import { fetchBalanceTrend } from "@/features/dashboard/db";
import { todayLocalMonthIso } from "@/shared/lib/date";

export function useBalanceTrend(referenceMonth: string = todayLocalMonthIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["analytics", "balance-trend", user?.id, referenceMonth],
    queryFn: () => fetchBalanceTrend(referenceMonth),
    enabled: !!user,
  });
}

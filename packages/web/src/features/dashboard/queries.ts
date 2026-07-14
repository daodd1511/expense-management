import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth";
import {
  fetchBalanceTrend,
  fetchDashboardSummary,
  fetchNetWorthTrend,
} from "@/features/dashboard/db";
import { todayLocalIso, todayLocalMonthIso } from "@/shared/lib/date";

export const dashboardQueryKeys = {
  balanceTrend: (userId: string | undefined, referenceMonth: string) =>
    ["analytics", "balance-trend", userId, referenceMonth] as const,
  summary: (userId: string | undefined, today: string) =>
    ["analytics", "dashboard-summary", userId, today] as const,
  netWorthTrend: (userId: string | undefined, referenceMonth: string) =>
    ["analytics", "net-worth-trend", userId, referenceMonth] as const,
};

export function useBalanceTrend(referenceMonth: string = todayLocalMonthIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: dashboardQueryKeys.balanceTrend(user?.id, referenceMonth),
    queryFn: () => fetchBalanceTrend(referenceMonth),
    enabled: !!user,
  });
}

export function useDashboardSummary(today: string = todayLocalIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: dashboardQueryKeys.summary(user?.id, today),
    queryFn: () => fetchDashboardSummary(today),
    enabled: !!user,
  });
}

export function useNetWorthTrend(referenceMonth: string = todayLocalMonthIso()) {
  const { user } = useAuth();
  return useQuery({
    queryKey: dashboardQueryKeys.netWorthTrend(user?.id, referenceMonth),
    queryFn: () => fetchNetWorthTrend(referenceMonth),
    enabled: !!user,
  });
}

import {
  balanceTrendResponseSchema,
  dashboardSummaryResponseSchema,
  netWorthTrendResponseSchema,
  type BalanceTrendPoint,
  type DashboardSummary,
  type NetWorthTrendPoint,
} from "@wallet/shared";
import { apiJson } from "@/core/api";

export async function fetchBalanceTrend(referenceMonth: string): Promise<BalanceTrendPoint[]> {
  const response = await apiJson(
    `/analytics/balance-trend?referenceMonth=${encodeURIComponent(referenceMonth)}`,
    balanceTrendResponseSchema,
  );
  return response.data;
}

export async function fetchDashboardSummary(today: string): Promise<DashboardSummary> {
  const response = await apiJson(
    `/analytics/dashboard-summary?today=${encodeURIComponent(today)}`,
    dashboardSummaryResponseSchema,
  );
  return response.data;
}

export async function fetchNetWorthTrend(referenceMonth: string): Promise<NetWorthTrendPoint[]> {
  const response = await apiJson(
    `/analytics/net-worth-trend?referenceMonth=${encodeURIComponent(referenceMonth)}`,
    netWorthTrendResponseSchema,
  );
  return response.data;
}

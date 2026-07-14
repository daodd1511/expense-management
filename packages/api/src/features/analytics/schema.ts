import { isoDateSchema } from "@wallet/shared";
import { z } from "zod";

// `today` is the caller's local calendar date — the server has no per-user timezone
// (same rationale as loans' `today` query param).
export const dashboardSummaryQuerySchema = z.object({ today: isoDateSchema });
export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;

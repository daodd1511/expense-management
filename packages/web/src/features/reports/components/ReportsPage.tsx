import { useEffect, useState } from "react";
import { ChartPie } from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useLang } from "@/core/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";
import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import type { ReportsSearch } from "@/routing/reports-search";
import { DEFAULT_REPORT_TYPE_ID, REPORT_TYPES, type ReportTypeId } from "../report-types";
import { resolveReportRange, type ReportRange, type ReportRangePreset } from "../report-date";
import { IncomeExpenseReport } from "./IncomeExpenseReport";
import { FinancialPositionReport } from "./FinancialPositionReport";
import { ReportRangeSelector } from "./ReportRangeSelector";

const REPORT_TYPE_OPTIONS = Object.values(REPORT_TYPES);
const DEFAULT_RANGE_PRESET: ReportRangePreset = "this-month";

type ReportRangeState = ReportRange & { preset: ReportRangePreset };

function defaultRangeState(): ReportRangeState {
  return { preset: DEFAULT_RANGE_PRESET, ...resolveReportRange(DEFAULT_RANGE_PRESET) };
}

function isFullSearch(search: ReportsSearch): search is Required<ReportsSearch> {
  return Boolean(search.preset && search.from && search.to);
}

export function ReportsPage() {
  const { t } = useLang();
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<ReportTypeId>(DEFAULT_REPORT_TYPE_ID);
  const activeReportType = REPORT_TYPES[activeType];

  const isReportsRoute = location.pathname === "/reports";
  const search = isReportsRoute ? (location.search as ReportsSearch) : {};
  const [range, setRange] = useState<ReportRangeState>(() =>
    isFullSearch(search) ? search : defaultRangeState(),
  );

  // Bare `/reports` visit (no preset/from/to/month at all) — write the resolved default
  // into the URL so it's bookmarkable, same as the prior month-only behavior.
  useEffect(() => {
    if (isReportsRoute && !search.preset && !search.from && !search.to) {
      void navigate({ to: "/reports", search: range, replace: true });
    }
  }, [isReportsRoute, search.preset, search.from, search.to, navigate, range]);

  // External navigation (back/forward, a shared link) changed the URL's range — sync state.
  const { preset: searchPreset, from: searchFrom, to: searchTo } = search;
  useEffect(() => {
    if (
      isReportsRoute &&
      searchPreset &&
      searchFrom &&
      searchTo &&
      (searchPreset !== range.preset || searchFrom !== range.from || searchTo !== range.to)
    ) {
      setRange({ preset: searchPreset, from: searchFrom, to: searchTo });
    }
  }, [isReportsRoute, searchPreset, searchFrom, searchTo, range.preset, range.from, range.to]);

  const handleRangeChange = (next: ReportRangeState) => {
    setRange(next);
    void navigate({ to: "/reports", search: next, replace: true });
  };

  return (
    <MobilePageContainer className="gap-6 lg:gap-4 lg:p-0">
      {isDesktop ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ReportTypeSelect value={activeType} onChange={setActiveType} className="w-56" />
            <ReportRangeSelector range={range} onChange={handleRangeChange} />
          </div>
        </>
      ) : (
        <Card>
          <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ChartPie className="size-4 text-muted-foreground" />
              <CardTitle>{t("reports.typeLabel")}</CardTitle>
            </div>
            <div className="w-full sm:max-w-xs">
              <ReportTypeSelect value={activeType} onChange={setActiveType} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm font-medium">{t(activeReportType.labelKey)}</p>
            <p className="text-sm text-muted-foreground">{t(activeReportType.descriptionKey)}</p>
            <ReportRangeSelector
              range={range}
              onChange={handleRangeChange}
              className="justify-between sm:justify-start sm:self-start"
            />
          </CardContent>
        </Card>
      )}

      {activeType === "income-expense" && <IncomeExpenseReport range={range} />}
      {activeType === "financial-position" && <FinancialPositionReport range={range} />}
    </MobilePageContainer>
  );
}

function ReportTypeSelect({
  value,
  onChange,
  className,
}: {
  value: ReportTypeId;
  onChange: (value: ReportTypeId) => void;
  className?: string;
}) {
  const { t } = useLang();

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => nextValue && onChange(nextValue as ReportTypeId)}
    >
      <SelectTrigger aria-label={t("reports.typeLabel")} className={className}>
        <SelectValue>{t(REPORT_TYPES[value].labelKey)}</SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            {REPORT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex flex-col items-start gap-0.5">
                  <span>{t(option.labelKey)}</span>
                  <span className="text-xs text-muted-foreground">{t(option.descriptionKey)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  );
}

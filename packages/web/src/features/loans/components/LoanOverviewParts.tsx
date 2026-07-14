import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { useLang } from "@/core/i18n";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatShortDate, formatVND } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import type { LoanStatus, LoanSummary } from "@wallet/shared";
import { LOAN_STATUS_KEYS, type LoanDirectionFilter, type LoanStatusFilter } from "./loan-ui";

const STATUS_TONE: Record<LoanStatus, string> = {
  open: "bg-muted text-muted-foreground",
  "due-soon": "bg-accent text-primary",
  overdue: "bg-expense-muted text-expense",
  repaid: "bg-income-muted text-income",
  "written-off": "bg-muted text-muted-foreground",
  forgiven: "bg-muted text-muted-foreground",
};

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const { t } = useLang();
  return (
    <Badge className={cn("border-0", STATUS_TONE[status])}>{t(LOAN_STATUS_KEYS[status])}</Badge>
  );
}

export function LoanKpiGrid({
  owedToUser,
  userOwes,
  netPosition,
  overdueCount,
  mobile = false,
}: {
  owedToUser: number;
  userOwes: number;
  netPosition: number;
  overdueCount: number;
  mobile?: boolean;
}) {
  const { t } = useLang();
  const items = [
    {
      label: t("loans.owedToUser"),
      value: formatVND(owedToUser),
      icon: ArrowDownLeft,
      tone: "text-income",
    },
    {
      label: t("loans.userOwes"),
      value: formatVND(userOwes),
      icon: ArrowUpRight,
      tone: "text-expense",
    },
    {
      label: t("loans.netPosition"),
      value: formatVND(netPosition),
      icon: Scale,
      tone: netPosition >= 0 ? "text-income" : "text-expense",
    },
    {
      label: t("loans.overdueCount"),
      value: String(overdueCount),
      icon: AlertTriangle,
      tone: overdueCount > 0 ? "text-expense" : "text-muted-foreground",
    },
  ];

  return (
    <div className={cn("grid gap-3", mobile ? "grid-cols-2" : "grid-cols-4")}>
      {items.map((item) => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className={cn("relative", mobile ? "p-4" : "p-5")}>
            <item.icon className={cn("absolute top-4 right-4 size-4", item.tone)} />
            <p className="pr-5 text-xs text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                "tabular mt-1 font-bold tracking-tight",
                mobile ? "text-lg" : "text-xl",
                item.tone,
              )}
            >
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LoanFilters({
  direction,
  status,
  onDirectionChange,
  onStatusChange,
}: {
  direction: LoanDirectionFilter;
  status: LoanStatusFilter;
  onDirectionChange: (value: LoanDirectionFilter) => void;
  onStatusChange: (value: LoanStatusFilter) => void;
}) {
  const { t } = useLang();
  const directions: Array<[LoanDirectionFilter, string]> = [
    ["all", t("loans.filterAll")],
    ["lending", t("loans.lending")],
    ["borrowing", t("loans.borrowing")],
  ];
  const statuses: Array<[LoanStatusFilter, string]> = [
    ["open-group", t("loans.filterOpen")],
    ["due-soon", t("loans.statusDueSoon")],
    ["overdue", t("loans.statusOverdue")],
    ["repaid", t("loans.statusRepaid")],
    ["written-off", t("loans.statusWrittenOff")],
    ["forgiven", t("loans.statusForgiven")],
    ["all", t("loans.filterAllHistory")],
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {directions.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={direction === value ? "default" : "outline"}
            onClick={() => onDirectionChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {statuses.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            className="shrink-0"
            variant={status === value ? "secondary" : "ghost"}
            onClick={() => onStatusChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function LoanSummaryRow({ loan, onOpen }: { loan: LoanSummary; onOpen: () => void }) {
  const { t } = useLang();
  const lending = loan.direction === "lending";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
          lending ? "bg-income-muted text-income" : "bg-expense-muted text-expense",
        )}
      >
        {lending ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {loan.description || loan.personName}
          </span>
          <LoanStatusBadge status={loan.status} />
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {lending ? t("loans.lending") : t("loans.borrowing")}
          {loan.dueDate ? ` · ${t("loans.dueDate")} ${formatShortDate(loan.dueDate)}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={cn(
            "tabular block text-sm font-bold",
            lending ? "text-income" : "text-expense",
          )}
        >
          {formatVND(loan.outstandingBalance)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("loans.ofOriginal", { amount: formatVND(loan.originAmount) })}
        </span>
      </span>
    </button>
  );
}

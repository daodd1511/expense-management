import { spendingAnalysisPresetSchema } from "@wallet/shared";
import type { TranslationKey } from "@/core/i18n";
import { useLang } from "@/core/i18n";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { todayLocalIso } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { resolveReportRange, type ReportRange, type ReportRangePreset } from "../report-date";

const REPORT_RANGE_PRESETS = spendingAnalysisPresetSchema.options;

const REPORT_RANGE_PRESET_LABELS: Record<ReportRangePreset, TranslationKey> = {
  "this-month": "reports.rangeThisMonth",
  "previous-month": "reports.rangePreviousMonth",
  "last-3-months": "reports.rangeLast3Months",
  "last-6-months": "reports.rangeLast6Months",
  "last-12-months": "reports.rangeLast12Months",
  custom: "reports.rangeCustom",
};

export function ReportRangeSelector({
  range,
  onChange,
  className,
}: {
  range: ReportRange & { preset: ReportRangePreset };
  onChange: (next: ReportRange & { preset: ReportRangePreset }) => void;
  className?: string;
}) {
  const { t } = useLang();
  const today = todayLocalIso();

  const handlePresetChange = (preset: ReportRangePreset) => {
    if (preset === "custom") {
      onChange({ preset, from: range.from, to: range.to });
      return;
    }
    onChange({ preset, ...resolveReportRange(preset) });
  };

  const handleFromChange = (from: string) => {
    onChange({ preset: "custom", from, to: from > range.to ? from : range.to });
  };

  const handleToChange = (to: string) => {
    onChange({ preset: "custom", from: to < range.from ? to : range.from, to });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={range.preset}
        onValueChange={(value) => value && handlePresetChange(value as ReportRangePreset)}
      >
        <SelectTrigger aria-label={t("reports.rangeLabel")} className="w-44">
          <SelectValue>{t(REPORT_RANGE_PRESET_LABELS[range.preset])}</SelectValue>
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner>
            <SelectPopup>
              {REPORT_RANGE_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {t(REPORT_RANGE_PRESET_LABELS[preset])}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>

      {range.preset === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker value={range.from} onChange={handleFromChange} max={today} className="w-36" />
          <span className="text-sm text-muted-foreground">{t("reports.rangeTo")}</span>
          <DatePicker value={range.to} onChange={handleToChange} max={today} className="w-36" />
        </div>
      )}
    </div>
  );
}

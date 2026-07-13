import { format } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useLang } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  max?: string;
}

function parseLocalIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({ value, onChange, className, max }: DatePickerProps) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const locale = lang === "vi" ? vi : enUS;
  const selected = value ? parseLocalIsoDate(value) : undefined;
  const maxDate = max ? parseLocalIsoDate(max) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(formatLocalIsoDate(date));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">
          {selected
            ? format(selected, lang === "vi" ? "dd/MM/yyyy" : "MMM d, yyyy", { locale })
            : t("form.date")}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner align="start">
          <PopoverPopup>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected}
              locale={locale}
              disabled={maxDate ? { after: maxDate } : undefined}
            />
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}

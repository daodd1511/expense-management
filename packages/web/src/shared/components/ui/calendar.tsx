import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/shared/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("p-3", className)}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      classNames={{
        root: "w-full",
        months: "relative",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center items-center h-7",
        caption_label: "text-sm font-semibold",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-muted hover:text-foreground transition-colors",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
        button_next: cn(
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground",
          "hover:bg-muted hover:text-foreground transition-colors",
          "disabled:pointer-events-none disabled:opacity-50",
        ),
        weekdays: "flex",
        weekday: "w-9 text-center text-xs font-medium text-muted-foreground",
        weeks: "w-full border-collapse",
        week: "flex w-full mt-1",
        day: "relative h-9 w-9 text-center text-sm",
        day_button: cn(
          "h-9 w-9 inline-flex items-center justify-center rounded-full text-sm font-medium",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        ),
        today: "bg-muted font-semibold text-foreground",
        selected:
          "bg-primary text-primary-foreground rounded-full hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-30 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

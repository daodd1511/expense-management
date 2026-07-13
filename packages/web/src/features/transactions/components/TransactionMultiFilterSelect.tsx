import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type FilterOption = {
  value: string;
  label: string;
};

export function TransactionMultiFilterSelect({
  values,
  ariaLabel,
  emptyLabel,
  selectedLabel,
  options,
  onChange,
}: {
  values: string[];
  ariaLabel: string;
  emptyLabel: string;
  selectedLabel: (count: number) => string;
  options: FilterOption[];
  onChange: (values: string[]) => void;
}) {
  const selectedOption =
    values.length === 1 ? options.find(({ value }) => value === values[0]) : null;
  const triggerLabel =
    selectedOption?.label ?? (values.length > 0 ? selectedLabel(values.length) : emptyLabel);

  return (
    <Select multiple value={values} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue>{triggerLabel}</SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            <button
              type="button"
              disabled={values.length === 0}
              onClick={() => onChange([])}
              className="flex min-h-9 w-full items-center rounded-md px-3 py-2 text-left text-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {emptyLabel}
            </button>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  );
}

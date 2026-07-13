import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/shared/components/ui/overlay";
import { useLang } from "@/core/i18n";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { cn } from "@/shared/lib/utils";

export interface CommandPaletteAction {
  id: string;
  label: string;
  section: string;
  onRun: () => void;
}

/**
 * Desktop command palette: Cmd/Ctrl+K toggles it open, typing filters `actions` by label,
 * arrow keys move the highlight, Enter runs the highlighted action.
 */
export function CommandPalette({ actions }: { actions: CommandPaletteAction[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useKeyboardShortcuts([{ key: "k", meta: true, handler: () => setOpen((current) => !current) }]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlighted(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((action) => action.label.toLowerCase().includes(needle));
  }, [actions, query]);

  const groups = useMemo(() => {
    const bySection = new Map<string, CommandPaletteAction[]>();
    for (const action of filtered) {
      const list = bySection.get(action.section) ?? [];
      list.push(action);
      bySection.set(action.section, list);
    }
    return [...bySection.entries()];
  }, [filtered]);

  const runAction = (action: CommandPaletteAction) => {
    setOpen(false);
    action.onRun();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = filtered[highlighted];
      if (action) runAction(action);
    }
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} className="max-w-lg p-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={t("palette.placeholder")}
          aria-label={t("palette.placeholder")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("palette.empty")}
          </p>
        )}
        {groups.map(([section, items]) => (
          <div key={section} className="mb-1">
            <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">{section}</p>
            {items.map((action) => {
              const index = filtered.indexOf(action);
              return (
                <button
                  key={action.id}
                  type="button"
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => runAction(action)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    index === highlighted ? "bg-accent text-primary" : "hover:bg-muted",
                  )}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}

import type { ComponentProps } from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/shared/lib/utils";

const DropdownMenu = Menu.Root;
const DropdownMenuTrigger = Menu.Trigger;

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof Menu.Popup> & { sideOffset?: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={sideOffset} align="end">
        <Menu.Popup
          className={cn(
            "z-50 min-w-40 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none",
            "data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
        "data-[highlighted]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<"div">) {
  return <div role="separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};

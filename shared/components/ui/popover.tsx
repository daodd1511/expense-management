
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from '@/lib/utils'

const PopoverRoot = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverPortal = PopoverPrimitive.Portal

function PopoverPositioner({
  className,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Positioner>) {
  return (
    <PopoverPrimitive.Positioner
      className={cn('z-50', className)}
      sideOffset={6}
      {...props}
    />
  )
}

function PopoverPopup({
  className,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup>) {
  return (
    <PopoverPrimitive.Popup
      className={cn(
        'rounded-xl border border-border bg-card p-0 text-card-foreground shadow-lg outline-none',
        'origin-[var(--transform-origin)] data-[starting-style]:scale-95 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-[transform,opacity] duration-150',
        className,
      )}
      {...props}
    />
  )
}

export {
  PopoverRoot as Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
}

import {
  Briefcase,
  Bus,
  Gamepad2,
  Gift,
  HeartPulse,
  House,
  ReceiptText,
  ShoppingBag,
  Tag,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Utensils,
  Bus,
  House,
  ReceiptText,
  Gamepad2,
  HeartPulse,
  ShoppingBag,
  Briefcase,
  Gift,
  Tag,
}

// Map category color token -> app theme css var.
export function colorVar(token: string): string {
  return `var(--${token})`
}

export function CategoryIcon({
  name,
  className,
  style,
}: {
  name: string | undefined
  className?: string
  style?: React.CSSProperties
}) {
  const Icon = (name && ICONS[name]) || Tag
  return <Icon className={className} style={style} aria-hidden="true" />
}

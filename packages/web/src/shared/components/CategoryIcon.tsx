import { Tag } from 'lucide-react'
import { CATEGORY_ICON_REGISTRY } from '@/shared/icons'

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
  const Icon = (name && CATEGORY_ICON_REGISTRY[name]) || Tag
  return <Icon className={className} style={style} aria-hidden="true" />
}

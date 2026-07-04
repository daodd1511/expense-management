import { ArrowDown, RefreshCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function PullToRefreshIndicator({
  pullDistance,
  isArmed,
  isRefreshing,
}: {
  pullDistance: number
  isArmed: boolean
  isRefreshing: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className="flex items-end justify-center overflow-hidden"
      style={{
        height: pullDistance,
        transition: 'height var(--duration-base) var(--ease-out)',
      }}
    >
      <div className="flex items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
        {isRefreshing ? (
          <RefreshCw className="size-4 animate-spin" />
        ) : (
          <ArrowDown
            className={cn(
              'size-4 transition-transform',
              isArmed && 'rotate-180',
            )}
            style={{
              transitionDuration: 'var(--duration-base)',
              transitionTimingFunction: 'var(--ease-in-out)',
            }}
          />
        )}
      </div>
    </div>
  )
}

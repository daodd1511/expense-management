import { useRef, useState } from 'react'

const MAX_PULL_DISTANCE = 96
const REFRESH_THRESHOLD = 72

export function usePullToRefresh({
  onRefresh,
  enabled = true,
}: {
  onRefresh: () => Promise<void>
  enabled?: boolean
}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const pullDistanceRef = useRef(0)

  const setDistance = (distance: number) => {
    pullDistanceRef.current = distance
    setPullDistance(distance)
  }

  const reset = () => {
    startYRef.current = null
    setDistance(0)
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (!enabled || isRefreshing || event.currentTarget.scrollTop > 0) return
    startYRef.current = event.touches[0].clientY
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (!enabled || isRefreshing || startYRef.current == null) return
    if (event.currentTarget.scrollTop > 0) {
      reset()
      return
    }

    const delta = event.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      setDistance(0)
      return
    }

    if (event.cancelable) {
      event.preventDefault()
    }
    setDistance(Math.min(MAX_PULL_DISTANCE, delta * 0.45))
  }

  const handleTouchEnd = () => {
    if (!enabled || isRefreshing || startYRef.current == null) return
    startYRef.current = null

    if (pullDistanceRef.current < REFRESH_THRESHOLD) {
      setDistance(0)
      return
    }

    setIsRefreshing(true)
    setDistance(REFRESH_THRESHOLD / 2)
    void onRefresh().finally(() => {
      setIsRefreshing(false)
      setDistance(0)
    })
  }

  return {
    bind: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: reset,
    },
    pullDistance,
    isRefreshing,
    isArmed: pullDistance >= REFRESH_THRESHOLD,
  }
}

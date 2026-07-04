import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePullToRefresh } from './usePullToRefresh'

function createTouchEvent({
  scrollTop = 0,
  clientY,
}: {
  scrollTop?: number
  clientY: number
}) {
  return {
    currentTarget: { scrollTop },
    touches: [{ clientY }],
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent<HTMLElement>
}

describe('usePullToRefresh', () => {
  it('does not arm or refresh when the list is already scrolled', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }))

    act(() => {
      result.current.bind.onTouchStart(createTouchEvent({ scrollTop: 12, clientY: 100 }))
      result.current.bind.onTouchMove(createTouchEvent({ scrollTop: 12, clientY: 240 }))
      result.current.bind.onTouchEnd()
    })

    expect(result.current.pullDistance).toBe(0)
    expect(result.current.isRefreshing).toBe(false)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('refreshes after a top-of-list pull that crosses the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePullToRefresh({ onRefresh }))

    act(() => {
      result.current.bind.onTouchStart(createTouchEvent({ clientY: 100 }))
      result.current.bind.onTouchMove(createTouchEvent({ clientY: 280 }))
      result.current.bind.onTouchEnd()
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(result.current.isRefreshing).toBe(true)

    await waitFor(() => expect(result.current.isRefreshing).toBe(false))
    expect(result.current.pullDistance).toBe(0)
  })
})

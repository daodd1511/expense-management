import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineBanner } from './OfflineBanner'

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    lang: 'en',
    t: (key: string) => ({ 'offline.banner': "You're offline — some features may not work" })[key] ?? key,
  }),
}))

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

describe('OfflineBanner', () => {
  const originalOnLine = navigator.onLine

  beforeEach(() => setOnLine(true))
  afterEach(() => setOnLine(originalOnLine))

  it('renders nothing while online', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the banner when the offline event fires', () => {
    render(<OfflineBanner />)

    act(() => {
      setOnLine(false)
      window.dispatchEvent(new Event('offline'))
    })

    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.getByText("You're offline — some features may not work")).toBeDefined()
  })

  it('hides the banner again when the online event fires', () => {
    setOnLine(false)
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeDefined()

    act(() => {
      setOnLine(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(screen.queryByRole('status')).toBeNull()
  })
})

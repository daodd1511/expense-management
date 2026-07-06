import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsDesktop } from './useIsDesktop'

function Probe() {
  const isDesktop = useIsDesktop()
  return <div>{String(isDesktop)}</div>
}

describe('useIsDesktop', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('reads the current media-query match on the first client render', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(min-width: 1024px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList)

    render(<Probe />)

    expect(screen.getByText('true')).toBeDefined()
  })
})

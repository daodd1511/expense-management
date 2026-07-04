import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('disables itself and marks busy while loading', () => {
    render(
      <Button loading>
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveProperty('disabled', true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('replaces the visible label when loadingLabel is provided', () => {
    render(
      <Button loading loadingLabel="Saving...">
        Save
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/core/types'
import { FavoriteCategoryPicker } from './FavoriteCategoryPicker'

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    lang: 'en',
    t: (key: string, vars?: Record<string, string>) =>
      ({
        'category.showAll': 'Show all',
        'category.noFavorites': 'No favorites yet',
        'category.expandGroup': `Expand ${vars?.name}`,
        'category.collapseGroup': `Collapse ${vars?.name}`,
      })[key] ?? key,
  }),
}))

const food: Category = { id: 'food', name: 'Food', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: null }
const restaurant: Category = { id: 'restaurant', name: 'Restaurant', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: 'food' }
const transport: Category = { id: 'transport', name: 'Transport', icon: 'Bus', color: 'chart-2', isSystem: true, type: 'expense', parentId: null }
const categories = [food, restaurant, transport]

describe('FavoriteCategoryPicker', () => {
  it('renders favorited categories as a flat tile grid', () => {
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Food' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Transport' })).toBeNull()
  })

  it('shows an empty-state message when nothing is favorited', () => {
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set()}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('No favorites yet')).toBeDefined()
  })

  it('appends the current selection even if it is not a favorite', () => {
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId="transport"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Food' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeDefined()
  })

  it('does not duplicate the current selection when it is already a favorite', () => {
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId="food"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('button', { name: 'Food' })).toHaveLength(1)
  })

  it('selecting a favorite tile calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId={null}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Food' }))

    expect(onSelect).toHaveBeenCalledWith('food')
  })

  it('opens the full picker modal on "Show all" and closes it on selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId={null}
        onSelect={onSelect}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Transport' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByRole('button', { name: 'Transport' })).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Transport' }))
    expect(onSelect).toHaveBeenCalledWith('transport')
  })
})

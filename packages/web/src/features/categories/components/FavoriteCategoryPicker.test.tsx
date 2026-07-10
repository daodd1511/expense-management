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
        'category.allCategories': 'All categories',
        'category.noFavorites': 'No favorites yet',
        'category.noFavoritesHint': 'Pick from the full list to get started',
        'category.browseAll': 'Browse all categories',
        'category.expandGroup': `Expand ${vars?.name}`,
        'category.collapseGroup': `Collapse ${vars?.name}`,
      })[key] ?? key,
  }),
}))

const isDesktopMock = vi.hoisted(() => vi.fn(() => true))

vi.mock('@/shared/hooks/useIsDesktop', () => ({
  useIsDesktop: isDesktopMock,
}))

const food: Category = { id: 'food', name: 'Food', icon: 'Utensils', color: 'chart-1', isSystem: true, isHidden: false, type: 'expense', parentId: null }
const restaurant: Category = { id: 'restaurant', name: 'Restaurant', icon: 'Utensils', color: 'chart-1', isSystem: true, isHidden: false, type: 'expense', parentId: 'food' }
const transport: Category = { id: 'transport', name: 'Transport', icon: 'Bus', color: 'chart-2', isSystem: true, isHidden: false, type: 'expense', parentId: null }
const categories = [food, restaurant, transport]

describe('FavoriteCategoryPicker', () => {
  it('renders favorited categories as compact tiles only', () => {
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

  it('keeps a favorited child category as a selected tile', () => {
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['restaurant'])}
        selectedId="restaurant"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeDefined()
  })

  it('shows an inviting empty state with a browse CTA when nothing is favorited', async () => {
    const user = userEvent.setup()
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set()}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('No favorites yet')).toBeDefined()
    expect(screen.getByText('Pick from the full list to get started')).toBeDefined()

    const panel = screen.getByRole('button', { name: /No favorites yet.*Browse all categories/s })
    await user.click(panel)
    expect(screen.getByRole('button', { name: 'Transport' })).toBeDefined()
  })

  it('shows a static empty-state panel with no CTA when disabled and no favorites', () => {
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set()}
        selectedId={null}
        onSelect={vi.fn()}
        disabled
      />,
    )

    expect(screen.getByText('No favorites yet')).toBeDefined()
    expect(screen.queryByText('Browse all categories')).toBeNull()
    expect(screen.queryByRole('button', { name: /No favorites yet/ })).toBeNull()
  })

  it('shows the current non-favorite selection as a separate full-width row', () => {
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
    expect(screen.getAllByRole('button', { name: 'Transport' })).toHaveLength(1)
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

  it('supports clearing the selection when allowClear is enabled', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId="food"
        onSelect={onSelect}
        allowClear
      />,
    )

    await user.click(screen.getAllByRole('button', { name: '—' })[0])

    expect(onSelect).toHaveBeenCalledWith('')
  })

  it('hides the show-all action and disables tiles when disabled', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId={null}
        onSelect={onSelect}
        disabled
      />,
    )

    expect(screen.queryByRole('button', { name: 'Show all' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Food' }))

    expect(onSelect).not.toHaveBeenCalled()
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

  it('opens the full picker as a bottom sheet on mobile', async () => {
    isDesktopMock.mockReturnValue(false)
    const user = userEvent.setup()
    render(
      <FavoriteCategoryPicker
        categories={categories}
        favoriteCategoryIds={new Set(['food'])}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Show all' }))

    expect(screen.getByRole('dialog', { name: 'All categories' })).toBeDefined()
    isDesktopMock.mockReturnValue(true)
  })
})

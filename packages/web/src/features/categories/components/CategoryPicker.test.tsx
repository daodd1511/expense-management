import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/core/types'
import { CategoryPicker } from './CategoryPicker'

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    lang: 'en',
    t: (key: string, vars?: Record<string, string>) =>
      key === 'category.expandGroup'
        ? `Expand ${vars?.name}`
        : key === 'category.collapseGroup'
          ? `Collapse ${vars?.name}`
          : key,
  }),
}))

const food: Category = { id: 'food', name: 'Food', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: null }
const restaurant: Category = { id: 'restaurant', name: 'Restaurant', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: 'food' }
const coffee: Category = { id: 'coffee', name: 'Coffee', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: 'food' }
const other: Category = { id: 'other', name: 'Other', icon: 'Ellipsis', color: 'chart-12', isSystem: true, type: 'expense', parentId: null }
const categories = [food, restaurant, coffee, other]

describe('CategoryPicker', () => {
  it('renders parents collapsed by default, hiding children', () => {
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Food' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Other' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Restaurant' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Coffee' })).toBeNull()
  })

  it('a leaf category with no children has no expand toggle', () => {
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /Expand Other/ })).toBeNull()
  })

  it('expands a group to reveal indented children on toggle', async () => {
    const user = userEvent.setup()
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Expand Food' }))

    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Coffee' })).toBeDefined()
  })

  it('auto-expands the group containing the currently selected child', () => {
    render(<CategoryPicker categories={categories} selectedId="coffee" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Coffee' })).toBeDefined()
  })

  it('keeps a selected child visible when its parent is collapsed', async () => {
    const user = userEvent.setup()
    render(<CategoryPicker categories={categories} selectedId="coffee" onSelect={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Collapse Food' }))

    expect(screen.queryByRole('button', { name: 'Restaurant' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Coffee' })).toBeDefined()
  })

  it('selecting a parent calls onSelect with the parent id', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Food' }))

    expect(onSelect).toHaveBeenCalledWith('food')
  })

  it('selecting a child calls onSelect with the child id', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<CategoryPicker categories={categories} selectedId="coffee" onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Restaurant' }))

    expect(onSelect).toHaveBeenCalledWith('restaurant')
  })
})

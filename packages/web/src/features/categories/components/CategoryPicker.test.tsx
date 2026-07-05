import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/core/types'
import { CategoryPicker } from './CategoryPicker'

const food: Category = { id: 'food', name: 'Food', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: null }
const restaurant: Category = { id: 'restaurant', name: 'Restaurant', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: 'food' }
const coffee: Category = { id: 'coffee', name: 'Coffee', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: 'food' }
const other: Category = { id: 'other', name: 'Other', icon: 'Ellipsis', color: 'chart-12', isSystem: true, type: 'expense', parentId: null }
const categories = [food, restaurant, coffee, other]

describe('CategoryPicker', () => {
  it('shows every category tile up front, with no expand step required', () => {
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Food' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Restaurant' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Coffee' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Other' })).toBeDefined()
  })

  it('renders a parent with no children with no tile grid below it', () => {
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={vi.fn()} />)

    const otherGroup = screen.getByRole('group', { name: 'Other' })
    expect(otherGroup.querySelectorAll('button')).toHaveLength(1)
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
    render(<CategoryPicker categories={categories} selectedId={null} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Restaurant' }))

    expect(onSelect).toHaveBeenCalledWith('restaurant')
  })

  it('marks the selected child as pressed', () => {
    render(<CategoryPicker categories={categories} selectedId="coffee" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Coffee' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('marks the selected parent as pressed', () => {
    render(<CategoryPicker categories={categories} selectedId="food" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Food' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('does not mark an unselected parent as pressed', () => {
    render(<CategoryPicker categories={categories} selectedId="coffee" onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Food' }).getAttribute('aria-pressed')).toBe('false')
  })
})

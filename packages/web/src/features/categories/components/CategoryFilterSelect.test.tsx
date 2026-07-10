import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/core/types'
import { CategoryFilterSelect } from './CategoryFilterSelect'

const food: Category = { id: 'food', name: 'Food', icon: 'Utensils', color: 'chart-1', isSystem: true, isHidden: false, type: 'expense', parentId: null }
const dating: Category = { id: 'dating', name: 'Dating', icon: 'Heart', color: 'chart-1', isSystem: false, isHidden: false, type: 'expense', parentId: 'food' }
const transport: Category = { id: 'transport', name: 'Transport', icon: 'Bus', color: 'chart-2', isSystem: true, isHidden: false, type: 'expense', parentId: null }
const hidden: Category = { id: 'adjustment', name: 'Balance Adjustment', icon: 'Scale', color: 'chart-12', isSystem: true, isHidden: true, type: 'expense', parentId: null }
const categories = [food, dating, transport, hidden]

describe('CategoryFilterSelect', () => {
  it('shows the selected category name in the trigger', () => {
    render(
      <CategoryFilterSelect
        categories={categories}
        value="food"
        onChange={vi.fn()}
        ariaLabel="Category"
        emptyLabel="All categories"
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Category' }).textContent).toContain('Food')
  })

  it('shows the empty label when nothing is selected', () => {
    render(
      <CategoryFilterSelect
        categories={categories}
        value=""
        onChange={vi.fn()}
        ariaLabel="Category"
        emptyLabel="All categories"
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Category' }).textContent).toContain('All categories')
  })

  it('opens to show every category grouped under its parent, as pill options', async () => {
    const user = userEvent.setup()
    render(
      <CategoryFilterSelect
        categories={categories}
        value=""
        onChange={vi.fn()}
        ariaLabel="Category"
        emptyLabel="All categories"
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Category' }))

    const optionLabels = screen.getAllByRole('option', { hidden: true }).map((option) => option.textContent)

    expect(optionLabels).toContain('Food')
    expect(optionLabels).toContain('Dating')
    expect(optionLabels).toContain('Transport')
    expect(optionLabels).not.toContain('Balance Adjustment')
    expect(optionLabels).toContain('All categories')
  })
})

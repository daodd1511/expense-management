import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/core/types'
import { CategoryFilterSelect } from './CategoryFilterSelect'

vi.mock('@/shared/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div role="option">{children}</div>,
  SelectGroup: ({ children }: { children: ReactNode }) => <div role="group">{children}</div>,
  SelectPopup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPositioner: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectPortal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children: ReactNode | ((value: string | null) => ReactNode) }) =>
    <div data-testid="select-value">{typeof children === 'function' ? children('food') : children}</div>,
}))

const food: Category = { id: 'food', name: 'Food', icon: 'Utensils', color: 'chart-1', isSystem: true, type: 'expense', parentId: null }
const dating: Category = { id: 'dating', name: 'Dating', icon: 'Heart', color: 'chart-1', isSystem: false, type: 'expense', parentId: 'food' }
const transport: Category = { id: 'transport', name: 'Transport', icon: 'Bus', color: 'chart-2', isSystem: true, type: 'expense', parentId: null }
const categories = [food, dating, transport]

describe('CategoryFilterSelect', () => {
  it('shows the selected category name and icon in the trigger', () => {
    render(
      <CategoryFilterSelect
        categories={categories}
        value="food"
        onChange={vi.fn()}
        ariaLabel="Category"
        emptyLabel="All categories"
      />,
    )

    expect(screen.getByTestId('select-value').textContent).toContain('Food')
  })

  it('groups children under their parent, with every category rendered once', () => {
    render(
      <CategoryFilterSelect
        categories={categories}
        value=""
        onChange={vi.fn()}
        ariaLabel="Category"
        emptyLabel="All categories"
      />,
    )

    // "Food" also appears in the mocked trigger (hardcoded to 'food' above), so assert
    // via the unambiguous labels plus a total option count instead.
    expect(screen.getByText('Dating')).toBeDefined()
    expect(screen.getByText('Transport')).toBeDefined()
    // "All categories" (empty option) + food + dating + transport = 4 options.
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('renders one group per parent category', () => {
    render(
      <CategoryFilterSelect
        categories={categories}
        value=""
        onChange={vi.fn()}
        ariaLabel="Category"
        emptyLabel="All categories"
      />,
    )

    expect(screen.getAllByRole('group')).toHaveLength(2)
  })
})

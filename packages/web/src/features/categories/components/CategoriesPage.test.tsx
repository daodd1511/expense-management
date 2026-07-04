import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '@/core/types'
import { CategoriesPage } from './CategoriesPage'

const storeMocks = vi.hoisted(() => ({
  addCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))

const systemCategory: Category = {
  id: 'system-food',
  name: 'System food',
  icon: 'Utensils',
  color: 'chart-1',
  isSystem: true,
  type: 'expense',
  parentId: null,
}

const customCategory: Category = {
  id: 'custom-coffee',
  name: 'Custom coffee',
  icon: 'Coffee',
  color: 'chart-2',
  isSystem: false,
  type: 'expense',
  parentId: null,
}

const nestedExpenseCategory: Category = {
  id: 'expense-lunch',
  name: 'Lunch',
  icon: 'Utensils',
  color: 'chart-1',
  isSystem: false,
  type: 'expense',
  parentId: 'system-food',
}

const incomeCategory: Category = {
  id: 'income-job',
  name: 'Job income',
  icon: 'Briefcase',
  color: 'chart-3',
  isSystem: true,
  type: 'income',
  parentId: null,
}

vi.mock('@/core/store', () => ({
  useStore: () => ({
    categories: [systemCategory, customCategory, nestedExpenseCategory, incomeCategory],
    favoriteCategoryIds: new Set<string>(),
    ...storeMocks,
  }),
}))

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    lang: 'en',
    t: (key: string, vars?: Record<string, string | number>) =>
      ({
        'settings.title': 'Settings',
        'settings.categories': 'Categories',
        'settings.categoriesActive': `${vars?.n} active categories`,
        'settings.add': 'Add',
        'settings.editCat': 'Edit category',
        'settings.newCat': 'New category',
        'settings.catDesc': 'Change category details',
        'settings.catType': 'Category type',
        'settings.catTypeExpense': 'Expense',
        'settings.catTypeIncome': 'Income',
        'dashboard.expense': 'Expense',
        'dashboard.income': 'Income',
        'settings.parentCat': 'Parent category',
        'settings.parentCatTopLevel': 'Top-level category',
        'settings.catName': 'Category name',
        'settings.catPlaceholder': 'E.g. Coffee',
        'settings.icon': 'Icon',
        'settings.iconLabel': `Choose icon ${vars?.icon}`,
        'settings.color': 'Color',
        'settings.colorLabel': `Choose color ${vars?.color}`,
        'settings.saveCat': 'Save category',
        'settings.createCat': 'Create category',
        'form.cancel': 'Cancel',
        'category.favorite': `Favorite ${vars?.name}`,
        'category.unfavorite': `Unfavorite ${vars?.name}`,
      })[key] ?? key,
  }),
}))

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters the list by type with the segmented control', async () => {
    const user = userEvent.setup()
    render(<CategoriesPage variant="desktop" onBack={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'System food' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Job income' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Income' }))

    expect(screen.getByRole('button', { name: 'Job income' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'System food' })).toBeNull()
  })

  it('disables editing for system categories while custom categories remain editable', async () => {
    const user = userEvent.setup()
    render(<CategoriesPage variant="desktop" onBack={vi.fn()} />)

    const systemButton = screen.getByRole('button', { name: 'System food' })
    expect(systemButton).toHaveProperty('disabled', true)

    await user.click(systemButton)
    expect(screen.queryByText('Edit category')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Custom coffee' }))
    expect(screen.getByText('Edit category')).toBeDefined()
  })

  it('creates a child category from the add form parent selector', async () => {
    const user = userEvent.setup()
    render(<CategoriesPage variant="desktop" onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add' }))
    const incomeParentOptions = screen
      .queryAllByRole('button', { name: 'Job income' })
      .filter((button) => !(button as HTMLButtonElement).disabled)
    expect(incomeParentOptions).toHaveLength(0)

    const parentOption = screen
      .getAllByRole('button', { name: 'System food' })
      .find((button) => !(button as HTMLButtonElement).disabled)

    expect(parentOption).toBeDefined()
    await user.click(parentOption as HTMLButtonElement)
    await user.type(screen.getByLabelText('Category name'), 'Lunch')
    await user.click(screen.getByRole('button', { name: 'Create category' }))

    expect(storeMocks.addCategory).toHaveBeenCalledWith({
      name: 'Lunch',
      icon: 'Tag',
      color: 'chart-1',
      type: 'expense',
      parentId: 'system-food',
    })
  })
})

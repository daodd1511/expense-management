import { describe, expect, it } from 'vitest'
import type { Category } from '@/core/types'
import { conflictsWithExistingBudget } from './BudgetForm'

const food: Category = { id: 'food', name: 'Food', icon: 'x', color: 'chart-1', isSystem: true, isHidden: false, type: 'expense', parentId: null }
const restaurant: Category = { id: 'restaurant', name: 'Restaurant', icon: 'x', color: 'chart-1', isSystem: true, isHidden: false, type: 'expense', parentId: 'food' }
const coffee: Category = { id: 'coffee', name: 'Coffee', icon: 'x', color: 'chart-1', isSystem: true, isHidden: false, type: 'expense', parentId: 'food' }
const categories = [food, restaurant, coffee]

describe('conflictsWithExistingBudget', () => {
  it('blocks a category that already has a direct budget', () => {
    expect(conflictsWithExistingBudget(food, categories, [{ categoryId: 'food', limit: 100 }])).toBe(true)
  })

  it('blocks a child when its parent already has a budget', () => {
    expect(
      conflictsWithExistingBudget(restaurant, categories, [{ categoryId: 'food', limit: 100 }]),
    ).toBe(true)
  })

  it('blocks a parent when any of its children already has a budget', () => {
    expect(
      conflictsWithExistingBudget(food, categories, [{ categoryId: 'coffee', limit: 50 }]),
    ).toBe(true)
  })

  it('allows a category with no budget conflicts in its branch', () => {
    expect(conflictsWithExistingBudget(restaurant, categories, [])).toBe(false)
  })

  it('excludes the budget being edited so editing does not self-block', () => {
    expect(
      conflictsWithExistingBudget(food, categories, [{ categoryId: 'food', limit: 100 }], 'food'),
    ).toBe(false)
  })
})

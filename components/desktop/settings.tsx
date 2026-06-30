'use client'

import { Check, Moon, Plus, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { CategoryIcon, colorVar } from '@/components/category-icon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useStore } from '@/lib/store'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLOR_OPTIONS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'income', 'expense'] as const

const ICON_OPTIONS = [
  'Utensils',
  'Bus',
  'House',
  'ReceiptText',
  'Gamepad2',
  'HeartPulse',
  'ShoppingBag',
  'Briefcase',
  'Gift',
  'Tag',
] as const

interface CategoryFormState {
  name: string
  icon: string
  color: string
}

const EMPTY_CATEGORY: CategoryFormState = {
  name: '',
  icon: 'Tag',
  color: 'chart-1',
}

export function DesktopSettings() {
  const { categories, addCategory, updateCategory } = useStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(categories[0]?.id ?? null)
  const editingCategory = categories.find((c) => c.id === editingId)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(() => toFormState(editingCategory))

  useEffect(() => setMounted(true), [])

  const handleSelectCategory = (category: Category) => {
    setEditingId(category.id)
    setCategoryForm(toFormState(category))
  }

  const handleNewCategory = () => {
    setEditingId(null)
    setCategoryForm(EMPTY_CATEGORY)
  }

  const handleSaveCategory = () => {
    const name = categoryForm.name.trim()
    if (!name) return

    const payload = {
      name,
      icon: categoryForm.icon,
      color: categoryForm.color,
    }

    if (editingId) updateCategory(editingId, payload)
    else addCategory(payload)
  }

  const canSaveCategory = categoryForm.name.trim().length > 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cài đặt</h1>
        <p className="text-sm text-muted-foreground">Quản lý danh mục và tùy chọn ứng dụng</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Giao diện</h2>
            <p className="text-sm text-muted-foreground">Chọn chế độ sáng hoặc tối</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['light', 'dark'] as const).map((t) => {
              const active = mounted && theme === t
              const Icon = t === 'light' ? Sun : Moon
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors',
                    active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {t === 'light' ? 'Sáng' : 'Tối'}
                  </span>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Danh mục</h2>
              <p className="text-sm text-muted-foreground">{categories.length} danh mục đang hoạt động</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleNewCategory}>
              <Plus className="size-3.5" />
              Thêm
            </Button>
          </div>

          <ul className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {categories.map((c) => (
              <li
                key={c.id}
                className="min-w-0"
              >
                <button
                  type="button"
                  onClick={() => handleSelectCategory(c)}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                    editingId === c.id ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: colorVar(c.color) }}
                  >
                    <CategoryIcon name={c.icon} className="size-3.5" />
                  </span>
                  <span className="truncate text-sm font-medium">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-flex size-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: colorVar(categoryForm.color) }}
              >
                <CategoryIcon name={categoryForm.icon} className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">
                  {editingId ? 'Sửa danh mục' : 'Thêm danh mục'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Thay đổi tên, biểu tượng và màu hiển thị
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category-name">Tên danh mục</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Cà phê"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Biểu tượng</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryForm((prev) => ({ ...prev, icon }))}
                      aria-label={`Chọn biểu tượng ${icon}`}
                      className={cn(
                        'inline-flex size-9 items-center justify-center rounded-lg border transition-colors',
                        categoryForm.icon === icon ? 'border-primary bg-accent text-primary' : 'border-border hover:bg-muted',
                      )}
                    >
                      <CategoryIcon name={icon} className="size-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Màu</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm((prev) => ({ ...prev, color }))}
                      aria-label={`Chọn màu ${color}`}
                      className={cn(
                        'size-8 rounded-full border-2 transition-transform active:scale-95',
                        categoryForm.color === color ? 'border-foreground' : 'border-transparent',
                      )}
                      style={{ backgroundColor: colorVar(color) }}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={!canSaveCategory}
                onClick={handleSaveCategory}
                className="w-full"
              >
                {editingId ? 'Lưu danh mục' : 'Tạo danh mục'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function toFormState(category: Category | undefined): CategoryFormState {
  if (!category) return EMPTY_CATEGORY
  return {
    name: category.name,
    icon: category.icon,
    color: category.color,
  }
}

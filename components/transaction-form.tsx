'use client'

import { ArrowRight, Camera, Delete, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { CategoryIcon, colorVar } from '@/components/category-icon'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatVND } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Transaction, TxType } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_TABS: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Chi tiền' },
  { value: 'income', label: 'Thu tiền' },
  { value: 'transfer', label: 'Chuyển khoản' },
]

const INCOME_CATS = ['salary', 'other-income']

export function TransactionForm({
  variant,
  initial,
  onSubmit,
  onCancel,
}: {
  variant: 'mobile' | 'desktop'
  initial?: Transaction
  onSubmit: (tx: Omit<Transaction, 'id'>) => void
  onCancel: () => void
}) {
  const { categories, accounts, getCategory } = useStore()
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [accountId, setAccountId] = useState<string>(initial?.accountId ?? accounts[0].id)
  const [toAccountId, setToAccountId] = useState<string>(
    initial?.toAccountId ?? accounts[1].id,
  )
  const [merchant, setMerchant] = useState(initial?.merchant ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(
    (initial?.date ?? new Date().toISOString()).slice(0, 10),
  )
  const [receipt, setReceipt] = useState<string | null>(initial?.receipt ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  const numericAmount = Number(amount) || 0
  const visibleCats = categories.filter((c) =>
    type === 'income' ? INCOME_CATS.includes(c.id) : !INCOME_CATS.includes(c.id),
  )

  const handleKeypad = (key: string) => {
    if (key === 'back') {
      setAmount((a) => a.slice(0, -1))
    } else if (key === '000') {
      setAmount((a) => (a ? a + '000' : a))
    } else {
      setAmount((a) => (a.length >= 12 ? a : a + key))
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setReceipt(URL.createObjectURL(file))
  }

  const canSubmit =
    numericAmount > 0 &&
    (type === 'transfer' ? accountId !== toAccountId : true) &&
    (type === 'transfer' || categoryId)

  const submit = () => {
    if (!canSubmit) return
    onSubmit({
      type,
      amount: numericAmount,
      categoryId: type === 'transfer' ? null : categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      merchant: merchant.trim() || (type === 'transfer' ? 'Chuyển khoản' : getCategory(categoryId)?.name || 'Giao dịch'),
      note: note.trim() || undefined,
      date: new Date(`${date}T${(initial?.date ?? new Date().toISOString()).slice(11, 19)}`).toISOString(),
      receipt,
    })
  }

  const amountTone =
    type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-foreground'

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3 sm:px-5">
        <h2 className="text-base font-semibold">
          {initial ? 'Sửa giao dịch' : 'Thêm giao dịch'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng"
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Type tabs */}
      <div className="px-4 sm:px-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setType(t.value)
                if (t.value === 'income') setCategoryId('salary')
                else if (t.value === 'expense' && INCOME_CATS.includes(categoryId ?? ''))
                  setCategoryId(null)
              }}
              className={cn(
                'rounded-lg py-2 text-sm font-medium transition-colors',
                type === t.value
                  ? t.value === 'income'
                    ? 'bg-income text-income-foreground'
                    : t.value === 'expense'
                      ? 'bg-expense text-expense-foreground'
                      : 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount display */}
      <div className="flex flex-col items-center gap-1 px-4 py-5 sm:px-5">
        <span className="text-xs text-muted-foreground">Số tiền</span>
        <div className={cn('tabular text-4xl font-bold tracking-tight', amountTone)}>
          {formatVND(numericAmount)}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        {/* Categories */}
        {type !== 'transfer' && (
          <div className="flex flex-col gap-2">
            <Label>Danh mục</Label>
            <div className="flex flex-wrap gap-2">
              {visibleCats.map((c) => {
                const active = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'border-transparent text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                    style={active ? { backgroundColor: colorVar(c.color) } : undefined}
                  >
                    <CategoryIcon name={c.icon} className="size-3.5" />
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Account / transfer pickers */}
        {type === 'transfer' ? (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label>Từ tài khoản</Label>
              <AccountSelect value={accountId} onChange={setAccountId} accounts={accounts} />
            </div>
            <ArrowRight className="mb-2.5 size-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-2">
              <Label>Đến tài khoản</Label>
              <AccountSelect value={toAccountId} onChange={setToAccountId} accounts={accounts} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>Tài khoản</Label>
            <AccountSelect value={accountId} onChange={setAccountId} accounts={accounts} />
          </div>
        )}

        {/* Merchant + date */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="merchant">Nơi giao dịch</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="VD: Highlands Coffee"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Ngày</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Ghi chú</Label>
          <Textarea
            id="note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm ghi chú (tùy chọn)"
          />
        </div>

        {/* Receipt */}
        <div className="flex flex-col gap-2">
          <Label>Hóa đơn</Label>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {receipt ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receipt || '/placeholder.svg'}
                  alt="Ảnh hóa đơn đính kèm"
                  className="size-16 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  aria-label="Xóa ảnh"
                  className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex size-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted"
              >
                <Camera className="size-5" />
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              Đính kèm ảnh hóa đơn để lưu trữ
            </span>
          </div>
        </div>
      </div>

      {/* Numeric keypad on mobile */}
      {variant === 'mobile' && (
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden border-t border-border bg-border">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleKeypad(k)}
              className="flex h-14 items-center justify-center bg-card text-xl font-semibold text-foreground active:bg-muted"
            >
              {k === 'back' ? <Delete className="size-5" /> : k}
            </button>
          ))}
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-4 sm:px-5">
        <Button variant="outline" size="lg" className="h-11 flex-1" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          size="lg"
          className="h-11 flex-[2]"
          disabled={!canSubmit}
          onClick={submit}
        >
          {initial ? 'Lưu thay đổi' : 'Thêm giao dịch'}
        </Button>
      </div>
    </div>
  )
}

function AccountSelect({
  value,
  onChange,
  accounts,
}: {
  value: string
  onChange: (v: string) => void
  accounts: { id: string; name: string }[]
}) {
  const labels = Object.fromEntries(accounts.map((account) => [account.id, account.name]))

  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger>
        <SelectValue>{(selected: string | null) => labels[selected ?? ''] ?? 'Chọn tài khoản'}</SelectValue>
      </SelectTrigger>
      <SelectPortal>
        <SelectPositioner>
          <SelectPopup>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectPopup>
        </SelectPositioner>
      </SelectPortal>
    </Select>
  )
}

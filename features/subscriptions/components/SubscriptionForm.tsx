import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input, Label } from '@/shared/components/ui/input'
import { useLang } from '@/core/i18n'
import { buildNextDueDate } from '@/features/subscriptions/helpers'
import { useStore } from '@/core/store'
import type { Subscription, SubscriptionCadence } from '@/core/types'
import { cn } from '@/shared/lib/utils'
import { formatVND } from '@/shared/lib/format'

const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseAmount(raw: string): number {
  return Number(raw.replace(/\D/g, '')) || 0
}

interface Props {
  initial?: Subscription
  onSubmit: (data: Omit<Subscription, 'id'>) => void
  onCancel: () => void
}

export function SubscriptionForm({ initial, onSubmit, onCancel }: Props) {
  const { t, lang } = useLang()
  const { categories, accounts } = useStore()

  const [name, setName] = useState(initial?.name ?? '')
  const [amountRaw, setAmountRaw] = useState(initial ? String(initial.amount) : '')
  const [type, setType] = useState<'expense' | 'income'>(initial?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '')
  const [cadence, setCadence] = useState<SubscriptionCadence>(initial?.cadence ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth ?? new Date().getDate())
  const [monthOfYear, setMonthOfYear] = useState(initial?.monthOfYear ?? new Date().getMonth() + 1)
  const [note, setNote] = useState(initial?.note ?? '')
  const [active] = useState(initial?.active ?? true)

  const MONTHS = lang === 'vi' ? MONTHS_VI : MONTHS_EN
  const amount = parseAmount(amountRaw)
  const canSubmit = name.trim().length > 0 && amount > 0 && accountId

  const handleSubmit = () => {
    if (!canSubmit) return
    const nextDueDate = initial?.nextDueDate ?? buildNextDueDate(dayOfMonth, monthOfYear, cadence)
    onSubmit({
      name: name.trim(),
      amount,
      type,
      categoryId,
      accountId,
      cadence,
      dayOfMonth,
      monthOfYear,
      nextDueDate,
      note: note.trim() || undefined,
      active,
    })
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3">
      {/* Type toggle */}
      <div className="flex flex-col gap-2">
        <Label>{t('form.expense') + ' / ' + t('form.income')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setType(tp)}
              className={cn(
                'rounded-xl border py-2.5 text-sm font-medium transition-colors',
                type === tp
                  ? tp === 'expense'
                    ? 'border-expense bg-expense-muted text-expense'
                    : 'border-income bg-income-muted text-income'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {tp === 'expense' ? t('form.expense') : t('form.income')}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-name">{t('sub.name')}</Label>
        <Input
          id="sub-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('sub.namePlaceholder')}
        />
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-amount">{t('form.amount')}</Label>
        <div className="relative">
          <Input
            id="sub-amount"
            inputMode="numeric"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
        </div>
        {amount > 0 && (
          <p className="text-xs text-muted-foreground">{formatVND(amount)}</p>
        )}
      </div>

      {/* Cadence */}
      <div className="flex flex-col gap-2">
        <Label>{t('sub.cadence')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              className={cn(
                'rounded-xl border py-2.5 text-sm font-medium transition-colors',
                cadence === c
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {c === 'monthly' ? t('sub.monthly') : t('sub.yearly')}
            </button>
          ))}
        </div>
      </div>

      {/* Day of month */}
      <div className={cn('grid gap-3', cadence === 'yearly' ? 'grid-cols-2' : 'grid-cols-1')}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub-day">{t('sub.dayOfMonth')}</Label>
          <Input
            id="sub-day"
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value))))}
          />
        </div>
        {cadence === 'yearly' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-month">{t('sub.monthOfYear')}</Label>
            <select
              id="sub-month"
              value={monthOfYear}
              onChange={(e) => setMonthOfYear(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <Label>{t('form.category')}</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              categoryId === null
                ? 'border-primary bg-accent text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            —
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                categoryId === c.id
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-account">{t('form.account')}</Label>
        <select
          id="sub-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub-note">{t('form.note')}</Label>
        <Input
          id="sub-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('form.notePlaceholder')}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="lg" className="h-11 flex-1" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button size="lg" className="h-11 flex-[2]" disabled={!canSubmit} onClick={handleSubmit}>
          {initial ? t('sub.save') : t('sub.create')}
        </Button>
      </div>
    </div>
  )
}

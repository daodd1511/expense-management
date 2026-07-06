
import { ArrowRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FavoriteCategoryPicker } from '@/features/categories/components/FavoriteCategoryPicker'
import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { FormErrorBanner } from '@/shared/components/FormErrorBanner'
import { Label, Textarea } from '@/shared/components/ui/input'
import { useFormSubmit } from '@/shared/hooks/useFormSubmit'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useCategories, useCategoryLookup } from '@/features/categories/queries'
import { useFavoriteCategoryIds } from '@/features/categories/favorites-queries'
import { useAccounts } from '@/features/accounts/queries'
import type { Transaction, TxType } from '@/core/types'
import { cn } from '@/shared/lib/utils'

function todayIsoDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function TransactionForm({
  variant,
  initial,
  onSubmit,
  onCancel,
}: {
  variant: 'mobile' | 'desktop'
  initial?: Transaction
  onSubmit: (tx: Omit<Transaction, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const getCategory = useCategoryLookup()
  const favoriteCategoryIds = useFavoriteCategoryIds()
  const { t } = useLang()
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null)
  const [accountId, setAccountId] = useState<string>(initial?.accountId ?? accounts[0].id)
  const [toAccountId, setToAccountId] = useState<string>(
    initial?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? '',
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState((initial?.date ?? todayIsoDate()).slice(0, 10))
  const amountInputRef = useRef<HTMLInputElement>(null)

  const TYPE_TABS: { value: TxType; label: string }[] = [
    { value: 'expense', label: t('form.expense') },
    { value: 'income', label: t('form.income') },
    { value: 'transfer', label: t('form.transfer') },
  ]

  const numericAmount = Number(amount) || 0
  const visibleCats = categories.filter((c) => c.type === type)

  const canSubmit =
    numericAmount > 0 &&
    (type === 'transfer' ? accountId !== toAccountId : true) &&
    (type === 'transfer' || categoryId)

  const { submit: submitForm, isSubmitting, errorMessage } = useFormSubmit(onSubmit)
  const fallbackMerchant =
    type === 'transfer' ? t('form.defaultTransfer') : getCategory(categoryId)?.name || t('form.defaultTx')

  useEffect(() => {
    const input = amountInputRef.current
    if (!input) return

    if (variant === 'mobile') {
      const timeoutId = window.setTimeout(() => {
        input.focus({ preventScroll: true })
      }, 250)

      return () => window.clearTimeout(timeoutId)
    }

    input.focus()
  }, [variant])

  const submit = () => {
    if (!canSubmit) return
    submitForm({
      type,
      amount: numericAmount,
      categoryId: type === 'transfer' ? null : categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      merchant: initial?.merchant?.trim() || fallbackMerchant,
      note: note.trim() || undefined,
      date,
      receipt: null,
    })
  }

  const amountTone =
    type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-foreground'

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3 sm:px-5">
        <h2 className="text-base font-semibold">
          {initial ? t('form.editTitle') : t('form.addTitle')}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('form.close')}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Type tabs */}
      <div className="px-4 sm:px-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setType(tab.value)
                if (tab.value !== 'transfer' && getCategory(categoryId)?.type !== tab.value) {
                  setCategoryId(null)
                }
              }}
              className={cn(
                'rounded-lg py-2 text-sm font-medium transition-colors',
                type === tab.value
                  ? tab.value === 'income'
                    ? 'bg-income text-income-foreground'
                    : tab.value === 'expense'
                      ? 'bg-expense text-expense-foreground'
                      : 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount input */}
      <div className="flex flex-col items-center gap-1 px-4 py-5 sm:px-5">
        <span className="text-xs text-muted-foreground">{t('form.amount')}</span>
        <input
          ref={amountInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount ? formatVND(Number(amount), false) : ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (v.length <= 12) setAmount(v)
          }}
          placeholder="0"
          className={cn(
            'w-full bg-transparent text-center text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40',
            amountTone,
          )}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-5">
        {/* Categories */}
        {type !== 'transfer' && (
          <div className="flex flex-col gap-2">
            <Label>{t('form.category')}</Label>
            <FavoriteCategoryPicker
              categories={visibleCats}
              favoriteCategoryIds={favoriteCategoryIds}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          </div>
        )}

        {/* Account / transfer pickers */}
        {type === 'transfer' ? (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label>{t('form.fromAccount')}</Label>
              <AccountSelect value={accountId} onChange={setAccountId} accounts={accounts} placeholder={t('form.selectAccount')} />
            </div>
            <ArrowRight className="mb-2.5 size-5 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-2">
              <Label>{t('form.toAccount')}</Label>
              <AccountSelect value={toAccountId} onChange={setToAccountId} accounts={accounts} placeholder={t('form.selectAccount')} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>{t('form.account')}</Label>
            <AccountSelect value={accountId} onChange={setAccountId} accounts={accounts} placeholder={t('form.selectAccount')} />
          </div>
        )}

        {/* Date */}
        <div className="flex flex-col gap-2">
          <Label>{t('form.date')}</Label>
          <DatePicker value={date} onChange={setDate} max={todayIsoDate()} />
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="note">{t('form.note')}</Label>
          <Textarea
            id="note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('form.notePlaceholder')}
          />
        </div>

      </div>

      {errorMessage && (
        <div className="px-4 pt-3 sm:px-5">
          <FormErrorBanner message={errorMessage} />
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-0 flex gap-2 bg-card p-4 sm:px-5">
        <Button variant="outline" size="lg" className="h-11 flex-1" disabled={isSubmitting} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button
          size="lg"
          className="h-11 flex-[2]"
          disabled={!canSubmit}
          loading={isSubmitting}
          onClick={submit}
        >
          {initial ? t('form.save') : t('form.submit')}
        </Button>
      </div>
    </div>
  )
}

function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  accounts: { id: string; name: string }[]
  placeholder: string
}) {
  const labels = Object.fromEntries(accounts.map((account) => [account.id, account.name]))

  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
      <SelectTrigger>
        <SelectValue>{(selected: string | null) => labels[selected ?? ''] ?? placeholder}</SelectValue>
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

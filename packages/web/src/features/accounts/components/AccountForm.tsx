
import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { FormErrorBanner } from '@/shared/components/FormErrorBanner'
import { Input, Label } from '@/shared/components/ui/input'
import { useFormSubmit } from '@/shared/hooks/useFormSubmit'
import { useLang } from '@/core/i18n'
import type { Account, AccountKind } from '@/core/types'
import { cn } from '@/shared/lib/utils'

type AccountInput = Omit<Account, 'id' | 'balance'>

const KINDS: { value: AccountKind; icon: LucideIcon }[] = [
  { value: 'cash', icon: Banknote },
  { value: 'bank', icon: Landmark },
  { value: 'card', icon: CreditCard },
  { value: 'ewallet', icon: Wallet },
]

export function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Account
  onSubmit: (data: AccountInput) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useLang()
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? 'cash')
  const [balance, setBalance] = useState(initial ? String(initial.openingBalance) : '0')

  const KIND_LABELS: Record<AccountKind, string> = {
    cash: t('accounts.kindCash'),
    bank: t('accounts.kindBank'),
    card: t('accounts.kindCard'),
    ewallet: t('accounts.kindEwallet'),
  }

  const canSubmit = name.trim().length > 0

  const { submit: submitForm, isSubmitting, errorMessage } = useFormSubmit(onSubmit)

  const submit = () => {
    if (!canSubmit) return
    submitForm({ name: name.trim(), kind, openingBalance: Number(balance) || 0 })
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3">
      {/* Kind */}
      <div className="flex flex-col gap-2">
        <Label>{t('accounts.kind')}</Label>
        <div className="grid grid-cols-4 gap-2">
          {KINDS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors',
                kind === value
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5" />
              {KIND_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="acc-name">{t('accounts.name')}</Label>
        <Input
          id="acc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('accounts.namePlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      {/* Balance */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="acc-balance">{t('accounts.balance')}</Label>
        <Input
          id="acc-balance"
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      </div>

      {errorMessage && <FormErrorBanner message={errorMessage} />}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="lg" className="h-11 flex-1" disabled={isSubmitting} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button size="lg" className="h-11 flex-[2]" disabled={!canSubmit} loading={isSubmitting} onClick={submit}>
          {initial ? t('accounts.save') : t('accounts.create')}
        </Button>
      </div>
    </div>
  )
}

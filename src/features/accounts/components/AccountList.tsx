
import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { computeBalance, useStore } from '@/core/store'
import type { AccountKind } from '@/core/types'
import { cn } from '@/shared/lib/utils'

export function AccountList({ className }: { className?: string }) {
  const { accounts, transactions } = useStore()
  const { t } = useLang()

  const KIND: Record<AccountKind, { icon: LucideIcon; label: string }> = {
    cash: { icon: Banknote, label: t('accounts.kindCash') },
    bank: { icon: Landmark, label: t('accounts.kindBank') },
    card: { icon: CreditCard, label: t('accounts.kindCard') },
    ewallet: { icon: Wallet, label: t('accounts.kindEwallet') },
  }

  return (
    <ul className={cn('flex flex-col divide-y divide-border', className)}>
      {accounts.map((a) => {
        const meta = KIND[a.kind]
        const Icon = meta.icon
        const bal = computeBalance(a.id, transactions, a.openingBalance)
        const negative = bal < 0
        return (
          <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">{meta.label}</span>
              </div>
            </div>
            <span
              className={cn(
                'tabular text-sm font-semibold',
                negative ? 'text-expense' : 'text-foreground',
              )}
            >
              {negative ? '−' : ''}
              {formatVND(Math.abs(bal))}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

'use client'

import { Banknote, CreditCard, Landmark, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatVND } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { AccountKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND: Record<AccountKind, { icon: LucideIcon; label: string }> = {
  cash: { icon: Banknote, label: 'Tiền mặt' },
  bank: { icon: Landmark, label: 'Ngân hàng' },
  card: { icon: CreditCard, label: 'Thẻ tín dụng' },
  ewallet: { icon: Wallet, label: 'Ví điện tử' },
}

export function AccountList({ className }: { className?: string }) {
  const { accounts } = useStore()
  return (
    <ul className={cn('flex flex-col divide-y divide-border', className)}>
      {accounts.map((a) => {
        const meta = KIND[a.kind]
        const Icon = meta.icon
        const negative = a.balance < 0
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
              {formatVND(a.balance)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

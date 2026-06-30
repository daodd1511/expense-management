'use client'

import { Banknote, CreditCard, Landmark, Plus, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
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

export function DesktopAccounts() {
  const { accounts } = useStore()
  const total = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tài khoản</h1>
          <p className="text-sm text-muted-foreground">Tổng số dư trên tất cả tài khoản</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Thêm tài khoản
        </button>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Tổng tài sản ròng</p>
        <p className="tabular mt-1 text-3xl font-semibold">{formatVND(total)}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => {
          const meta = KIND[a.kind]
          const Icon = meta.icon
          const negative = a.balance < 0
          return (
            <Card key={a.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{a.name}</p>
                <p className={cn('tabular mt-1 text-xl font-semibold', negative && 'text-expense')}>
                  {negative ? '−' : ''}
                  {formatVND(a.balance)}
                </p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

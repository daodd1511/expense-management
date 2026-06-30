'use client'

import { Plus, Wallet } from 'lucide-react'
import { AccountList } from '@/components/shared/account-list'
import { Card, CardContent } from '@/components/ui/card'
import { formatVND } from '@/lib/format'
import { useStore } from '@/lib/store'

export function MobileAccounts() {
  const { accounts } = useStore()
  const net = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Wallet className="size-4" /> Tổng tài sản ròng
          </div>
          <div className="tabular mt-1 text-3xl font-bold tracking-tight">{formatVND(net)}</div>
          <p className="mt-1 text-sm opacity-80">{accounts.length} tài khoản</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Danh sách tài khoản</h2>
          <AccountList />
        </CardContent>
      </Card>

      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-4" /> Thêm tài khoản
      </button>
    </div>
  )
}

'use client'

import { ArrowLeftRight, Home, Plus, Wallet, Wallet2 } from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { TransactionForm } from '@/components/transaction-form'
import { BottomSheet } from '@/components/ui/overlay'
import { useStore } from '@/lib/store'
import type { Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MobileAccounts } from './accounts'
import { MobileBudgets } from './budgets'
import { MobileHome } from './home'
import { MobileTransactions } from './transactions'

type Screen = 'home' | 'transactions' | 'budgets' | 'accounts'

const TITLES: Record<Screen, string> = {
  home: 'Tổng quan',
  transactions: 'Giao dịch',
  budgets: 'Ngân sách',
  accounts: 'Tài khoản',
}

const NAV: { screen: Screen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Trang chủ', icon: Home },
  { screen: 'transactions', label: 'Giao dịch', icon: ArrowLeftRight },
  { screen: 'budgets', label: 'Ngân sách', icon: Wallet2 },
  { screen: 'accounts', label: 'Tài khoản', icon: Wallet },
]

export function MobileApp() {
  const { addTransaction, updateTransaction } = useStore()
  const [screen, setScreen] = useState<Screen>('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const openAdd = () => {
    setEditing(null)
    setSheetOpen(true)
  }
  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setSheetOpen(true)
  }
  const close = () => {
    setSheetOpen(false)
    setEditing(null)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" />
          </span>
          <h1 className="text-base font-semibold tracking-tight">{TITLES[screen]}</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Screen */}
      <main className="flex-1 pb-24">
        {screen === 'home' && <MobileHome onNavigate={(s) => setScreen(s as Screen)} onEdit={openEdit} />}
        {screen === 'transactions' && <MobileTransactions onEdit={openEdit} />}
        {screen === 'budgets' && <MobileBudgets />}
        {screen === 'accounts' && <MobileAccounts />}
      </main>

      {/* Bottom nav with center FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md">
        <div className="relative border-t border-border bg-card/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          <div className="grid grid-cols-5 items-center">
            {NAV.slice(0, 2).map((n) => (
              <NavButton key={n.screen} {...n} active={screen === n.screen} onClick={() => setScreen(n.screen)} />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={openAdd}
                aria-label="Thêm giao dịch"
                className="-mt-7 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <Plus className="size-6" />
              </button>
            </div>
            {NAV.slice(2).map((n) => (
              <NavButton key={n.screen} {...n} active={screen === n.screen} onClick={() => setScreen(n.screen)} />
            ))}
          </div>
        </div>
      </nav>

      <BottomSheet open={sheetOpen} onClose={close} title="Thêm giao dịch">
        <TransactionForm
          variant="mobile"
          initial={editing ?? undefined}
          onCancel={close}
          onSubmit={(tx) => {
            if (editing) updateTransaction(editing.id, tx)
            else addTransaction(tx)
            close()
          }}
        />
      </BottomSheet>
    </div>
  )
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: typeof Home
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-1 text-[0.65rem] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className={cn('size-5', active && 'fill-primary/15')} />
      {label}
    </button>
  )
}

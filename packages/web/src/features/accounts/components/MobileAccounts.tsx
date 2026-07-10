
import { Banknote, CreditCard, Landmark, Pencil, Plus, Scale, Trash2, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AccountForm } from '@/features/accounts/components/AccountForm'
import { ReconcileBalanceForm } from '@/features/accounts/components/ReconcileBalanceForm'
import { AccountsSkeleton } from '@/shared/components/Skeleton'
import { useSwipeActions } from '@/shared/hooks/useSwipeActions'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { BottomSheet } from '@/shared/components/ui/overlay'
import { MobilePageContainer } from '@/shared/components/MobilePageContainer'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { useAccounts, useAddAccount, useDeleteAccount, useUpdateAccount } from '@/features/accounts/queries'
import type { Account, AccountKind } from '@/core/types'
import { cn } from '@/shared/lib/utils'

const KIND_ICONS: Record<AccountKind, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  card: CreditCard,
  ewallet: Wallet,
}

const SWIPE_ACTION_WIDTH = 196

function AccountRow({
  account,
  balance,
  kindLabel,
  onEdit,
  onReconcile,
  onDelete,
  onViewTransactions,
  reconcileLabel,
}: {
  account: Account
  balance: number
  kindLabel: string
  onEdit: () => void
  onReconcile: () => void
  onDelete: () => void
  onViewTransactions: () => void
  reconcileLabel: string
}) {
  const { offset, isDragging, bind } = useSwipeActions(SWIPE_ACTION_WIDTH)
  const Icon = KIND_ICONS[account.kind]
  const negative = balance < 0

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onReconcile}
          aria-label={reconcileLabel}
          className="flex w-16 items-center justify-center bg-muted text-foreground"
        >
          <Scale className="size-4" />
        </button>
        <button
          type="button"
          onClick={onViewTransactions}
          aria-label="Edit"
          className="flex w-16 items-center justify-center bg-accent text-accent-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="flex w-16 items-center justify-center bg-expense text-expense-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div
        className="touch-pan-y flex items-center gap-3 bg-card py-3"
        style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
        {...bind}
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <span className="flex flex-col">
            <span className="text-sm font-medium">{account.name}</span>
            <span className="text-xs text-muted-foreground">{kindLabel}</span>
          </span>
          <span className={cn('tabular shrink-0 text-sm font-semibold', negative ? 'text-expense' : 'text-foreground')}>
            {negative ? '−' : ''}{formatVND(Math.abs(balance))}
          </span>
        </button>
      </div>
    </div>
  )
}

export function MobileAccounts() {
  const navigate = useNavigate()
  const { data: accounts = [], isPending } = useAccounts()
  const addAcc = useAddAccount()
  const updateAcc = useUpdateAccount()
  const deleteAcc = useDeleteAccount()
  const { t } = useLang()
  const net = accounts.reduce((sum, account) => sum + (account.balance ?? account.openingBalance), 0)
  const [editing, setEditing] = useState<Account | null>(null)
  const [reconciling, setReconciling] = useState<Account | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const KIND_LABELS: Record<AccountKind, string> = {
    cash: t('accounts.kindCash'),
    bank: t('accounts.kindBank'),
    card: t('accounts.kindCard'),
    ewallet: t('accounts.kindEwallet'),
  }

  const openAdd = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (account: Account) => {
    setEditing(account)
    setReconciling(null)
    setSheetOpen(true)
  }

  const openReconcile = (account: Account) => {
    setEditing(null)
    setReconciling(account)
    setSheetOpen(true)
  }

  const close = () => {
    setSheetOpen(false)
    setEditing(null)
    setReconciling(null)
  }

  const handleSubmit = async (data: Omit<Account, 'id' | 'balance'>) => {
    if (editing) await updateAcc.mutateAsync({ id: editing.id, patch: data })
    else await addAcc.mutateAsync(data)
    close()
  }

  if (isPending) return <AccountsSkeleton mobile />

  return (
    <MobilePageContainer>
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Wallet className="size-4" /> {t('accounts.netWorth')}
          </div>
          <div className="tabular mt-1 text-3xl font-bold tracking-tight">{formatVND(net)}</div>
          <p className="mt-1 text-sm opacity-80">{t('accounts.count', { n: accounts.length })}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold tracking-tight">{t('accounts.list')}</h2>
        </CardContent>
        <div className="flex flex-col divide-y divide-border px-4">
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              balance={a.balance ?? a.openingBalance}
              kindLabel={KIND_LABELS[a.kind]}
              onEdit={() => openEdit(a)}
              onReconcile={() => openReconcile(a)}
              onDelete={() => setPendingDeleteId(a.id)}
              onViewTransactions={() => navigate({ to: '/transactions', search: { accountId: a.id } })}
              reconcileLabel={t('accounts.reconcile')}
            />
          ))}
        </div>
        <div className="pb-1" />
      </Card>

      <button
        type="button"
        onClick={openAdd}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-4" /> {t('accounts.add')}
      </button>

      <BottomSheet
        open={sheetOpen}
        onClose={close}
        title={reconciling ? t('accounts.reconcileTitle') : editing ? t('accounts.editTitle') : t('accounts.addTitle')}
      >
        {reconciling ? (
          <ReconcileBalanceForm account={reconciling} onCancel={close} />
        ) : (
          <AccountForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={close} />
        )}
      </BottomSheet>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) await deleteAcc.mutateAsync(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </MobilePageContainer>
  )
}

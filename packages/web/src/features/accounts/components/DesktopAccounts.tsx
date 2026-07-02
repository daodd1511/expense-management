
import { Banknote, CreditCard, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { AccountForm } from '@/features/accounts/components/AccountForm'
import { Card } from '@/shared/components/ui/card'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { Modal } from '@/shared/components/ui/overlay'
import { formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import { computeBalance, useStore } from '@/core/store'
import type { Account, AccountKind } from '@/core/types'
import { cn } from '@/shared/lib/utils'

export function DesktopAccounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useStore()
  const { t } = useLang()
  const total = accounts.reduce((s, a) => s + computeBalance(a.id, transactions, a.openingBalance), 0)
  const [editing, setEditing] = useState<Account | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const KIND: Record<AccountKind, { icon: LucideIcon; label: string }> = {
    cash: { icon: Banknote, label: t('accounts.kindCash') },
    bank: { icon: Landmark, label: t('accounts.kindBank') },
    card: { icon: CreditCard, label: t('accounts.kindCard') },
    ewallet: { icon: Wallet, label: t('accounts.kindEwallet') },
  }

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (account: Account) => {
    setEditing(account)
    setModalOpen(true)
  }

  const close = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleSubmit = (data: Omit<Account, 'id'>) => {
    if (editing) updateAccount(editing.id, data)
    else addAccount(data)
    close()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('accounts.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounts.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t('accounts.add')}
        </button>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">{t('accounts.netWorth')}</p>
        <p className="tabular mt-1 text-3xl font-semibold">{formatVND(total)}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => {
          const meta = KIND[a.kind]
          const Icon = meta.icon
          const bal = computeBalance(a.id, transactions, a.openingBalance)
          const negative = bal < 0
          return (
            <Card key={a.id} className="group flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    aria-label={t('accounts.edit')}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(a.id)}
                    aria-label={t('confirm.delete')}
                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-expense/10 hover:text-expense group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{a.name}</p>
                <p className={cn('tabular mt-1 text-xl font-semibold', negative && 'text-expense')}>
                  {negative ? '−' : ''}
                  {formatVND(Math.abs(bal))}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={close}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">
            {editing ? t('accounts.editTitle') : t('accounts.addTitle')}
          </h2>
        </div>
        <AccountForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={close} />
      </Modal>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) deleteAccount(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}

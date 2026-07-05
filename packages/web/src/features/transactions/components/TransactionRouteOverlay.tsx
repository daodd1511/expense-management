import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLang } from '@/core/i18n'
import { BottomSheet, Drawer } from '@/shared/components/ui/overlay'
import { useAddTransaction, useTransactions, useUpdateTransaction } from '@/features/transactions/queries'
import type { TransactionOverlayState } from '@/routing/transaction-overlay'
import { TransactionForm } from './TransactionForm'

export function TransactionRouteOverlay({
  variant,
  overlay,
}: {
  variant: 'mobile' | 'desktop'
  overlay: TransactionOverlayState | null
}) {
  const navigate = useNavigate()
  const { t } = useLang()
  const { data: transactions = [] } = useTransactions()
  const addTransaction = useAddTransaction()
  const updateTransaction = useUpdateTransaction()
  const editing =
    overlay?.mode === 'edit'
      ? transactions.find((transaction) => transaction.id === overlay.transactionId)
      : undefined

  useEffect(() => {
    if (overlay?.mode === 'edit' && !editing) {
      void navigate({ href: overlay.returnTo, replace: true })
    }
  }, [editing, navigate, overlay])

  if (!overlay) {
    return null
  }

  if (overlay.mode === 'edit' && !editing) {
    return null
  }

  const close = () => {
    void navigate({ href: overlay.returnTo, replace: true })
  }

  const form = (
    <TransactionForm
      variant={variant}
      initial={editing}
      onCancel={close}
      onSubmit={async (transaction) => {
        if (editing) {
          await updateTransaction.mutateAsync({ id: editing.id, patch: transaction })
        } else {
          await addTransaction.mutateAsync(transaction)
        }

        await navigate({ href: overlay.returnTo, replace: true })
      }}
    />
  )

  if (variant === 'mobile') {
    return (
      <BottomSheet
        open
        onClose={close}
        title={overlay.mode === 'edit' ? t('form.editTitle') : t('form.addTitle')}
      >
        {form}
      </BottomSheet>
    )
  }

  return (
    <Drawer open onClose={close}>
      {form}
    </Drawer>
  )
}

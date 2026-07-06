import { useLang } from '@/core/i18n'
import { useAddTransaction } from '@/features/transactions/queries'
import { monthFromHref } from '@/features/transactions/view-state'
import { BottomSheet } from '@/shared/components/ui/overlay'
import { TransactionForm } from './TransactionForm'

export function MobileQuickAddTransactionSheet({
  open,
  returnTo,
  onClose,
}: {
  open: boolean
  returnTo: string
  onClose: () => void
}) {
  const { t } = useLang()
  const addTransaction = useAddTransaction(monthFromHref(returnTo))

  return (
    <BottomSheet open={open} onClose={onClose} title={t('form.addTitle')}>
      <TransactionForm
        variant="mobile"
        onCancel={onClose}
        onSubmit={async (transaction) => {
          await addTransaction.mutateAsync(transaction)
          onClose()
        }}
      />
    </BottomSheet>
  )
}

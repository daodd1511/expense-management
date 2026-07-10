import { useState } from 'react'
import { useCategories } from '@/features/categories/queries'
import { useAddTransaction } from '@/features/transactions/queries'
import { FormErrorBanner } from '@/shared/components/FormErrorBanner'
import { Button } from '@/shared/components/ui/button'
import { Input, Label } from '@/shared/components/ui/input'
import { todayLocalIso } from '@/shared/lib/date'
import { formatVND } from '@/shared/lib/format'
import { useFormSubmit } from '@/shared/hooks/useFormSubmit'
import { useLang } from '@/core/i18n'
import type { Account } from '@/core/types'
import type { TransactionCreate } from '@wallet/shared'

function findAdjustmentCategoryId(
  categories: Awaited<ReturnType<typeof useCategories>>['data'],
  type: 'expense' | 'income',
) {
  return categories?.find(
    (category) => category.isHidden && category.name === 'Balance Adjustment' && category.type === type,
  )?.id
}

export function ReconcileBalanceForm({ account, onCancel }: { account: Account; onCancel: () => void }) {
  const { data: categories } = useCategories()
  const addTransaction = useAddTransaction()
  const { t } = useLang()
  const computedBalance = account.balance ?? account.openingBalance
  const [actualBalanceInput, setActualBalanceInput] = useState(String(computedBalance))
  const actualBalance = Number(actualBalanceInput)
  const hasActualBalance = actualBalanceInput.trim() !== '' && Number.isFinite(actualBalance)
  const delta = hasActualBalance ? actualBalance - computedBalance : 0
  const type = delta < 0 ? 'expense' : 'income'
  const categoryId = findAdjustmentCategoryId(categories, type)
  const canSubmit = hasActualBalance && (delta === 0 || categoryId !== undefined)

  const { submit, isSubmitting, errorMessage } = useFormSubmit<TransactionCreate>(async (transaction) => {
    await addTransaction.mutateAsync(transaction)
    onCancel()
  })

  const handleSubmit = () => {
    if (!canSubmit) return
    if (delta === 0) {
      onCancel()
      return
    }

    if (!categoryId) return
    submit({
      type,
      amount: Math.abs(delta),
      categoryId,
      accountId: account.id,
      toAccountId: null,
      merchant: t('accounts.reconcileTransaction'),
      note: undefined,
      date: todayLocalIso(),
      receipt: null,
    })
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3">
      <div className="flex flex-col gap-1 rounded-xl bg-muted p-4">
        <span className="text-sm text-muted-foreground">{t('accounts.computedBalance')}</span>
        <span className="tabular text-xl font-semibold">{formatVND(computedBalance)}</span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="actual-balance">{t('accounts.actualBalance')}</Label>
        <Input
          id="actual-balance"
          type="number"
          value={actualBalanceInput}
          onChange={(event) => setActualBalanceInput(event.target.value)}
        />
      </div>

      {errorMessage && <FormErrorBanner message={errorMessage} />}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="lg" className="h-11 flex-1" disabled={isSubmitting} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button size="lg" className="h-11 flex-[2]" disabled={!canSubmit} loading={isSubmitting} onClick={handleSubmit}>
          {t('accounts.saveAdjustment')}
        </Button>
      </div>
    </div>
  )
}

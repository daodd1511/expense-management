import { Bell, X } from 'lucide-react'
import { useState } from 'react'
import { useLang } from '@/core/i18n'
import { SubscriptionLogConfirm } from '@/features/subscriptions/components/SubscriptionLogConfirm'
import { useLogSubscription, useSubscriptions } from '@/features/subscriptions/queries'
import { useTransactions } from '@/features/transactions/queries'
import { Button } from '@/shared/components/ui/button'
import { dueBanner } from '@/features/subscriptions/helpers'
import { todayLocalIso } from '@/shared/lib/date'
import { formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import type { Subscription } from '@/core/types'

export function SubscriptionDueBanner({
  onLog,
  confirmVariant = 'modal',
}: {
  onLog?: (id: string) => void
  confirmVariant?: 'modal' | 'sheet'
}) {
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: transactions = [] } = useTransactions()
  const logSub = useLogSubscription()
  const { t } = useLang()
  const [dismissed, setDismissed] = useState(false)
  const [pendingSubscription, setPendingSubscription] = useState<Subscription | null>(null)

  const due = dueBanner(subscriptions, transactions)

  if (dismissed || due.length === 0) return null

  const handleConfirm = async (subscription: Subscription) => {
    await logSub.mutateAsync(subscription)
    setPendingSubscription(null)
    onLog?.(subscription.id)
  }

  return (
    <>
      <div className="mx-4 mt-3 rounded-xl border border-primary/30 bg-accent px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {due.length === 1
                ? t('sub.bannerSingle', { name: due[0].name })
                : t('sub.bannerTitle', { n: due.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={t('sub.dismiss')}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className={cn('mt-2 flex flex-col gap-1.5', due.length > 1 && 'mt-3')}>
          {due.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {sub.name} · <span className="tabular font-medium text-foreground">{formatVND(sub.amount)}</span>
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setPendingSubscription(sub)}
                className="shrink-0 px-3 py-1 text-xs font-semibold active:scale-95"
              >
                {t('sub.logNow')}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <SubscriptionLogConfirm
        open={pendingSubscription !== null}
        subscription={pendingSubscription}
        transactionDate={todayLocalIso()}
        variant={confirmVariant}
        isSubmitting={logSub.isPending}
        onCancel={() => setPendingSubscription(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}

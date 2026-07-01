import { Bell, X } from 'lucide-react'
import { useState } from 'react'
import { useLang } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import { dueBanner } from '@/lib/subscriptions'
import { formatVND } from '@/lib/format'
import { cn } from '@/lib/utils'

export function SubscriptionDueBanner({ onLog }: { onLog?: (id: string) => void }) {
  const { subscriptions, transactions, logSubscription } = useStore()
  const { t } = useLang()
  const [dismissed, setDismissed] = useState(false)

  const due = dueBanner(subscriptions, transactions)

  if (dismissed || due.length === 0) return null

  const handleLog = (id: string) => {
    logSubscription(id)
    onLog?.(id)
  }

  return (
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
            <button
              type="button"
              onClick={() => handleLog(sub.id)}
              className="shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
            >
              {t('sub.logNow')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

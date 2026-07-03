import { WifiOff } from 'lucide-react'
import { useLang } from '@/core/i18n'
import { useOnlineStatus } from '@/core/useOnlineStatus'

/**
 * Fixed top-of-viewport strip shown whenever the browser reports no connectivity.
 * Reads and writes still hit the network and fail normally while offline — this app
 * has no offline write queue — the banner exists only to make that failure legible
 * instead of silent.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { t } = useLang()

  if (isOnline) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-expense px-4 py-2 text-sm font-medium text-expense-foreground"
    >
      <WifiOff className="size-4 shrink-0" />
      {t('offline.banner')}
    </div>
  )
}

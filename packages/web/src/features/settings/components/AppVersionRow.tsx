import { APP_COMMIT, APP_COMMIT_DATE, APP_VERSION } from '@/core/appVersion'
import { useLang } from '@/core/i18n'
import { usePwaUpdate } from '@/core/PwaUpdateProvider'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

export function AppVersionRow() {
  const { t } = useLang()
  const { needRefresh, updateServiceWorker } = usePwaUpdate()

  return (
    <Card className="flex flex-col gap-2 px-5 py-4">
      <p className="text-sm font-medium">{t('settings.version')}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{APP_VERSION} · {APP_COMMIT} · {APP_COMMIT_DATE}</p>
        {needRefresh ? (
          <Button variant="outline" size="sm" onClick={() => void updateServiceWorker(true)}>
            {t('settings.updateAction')}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

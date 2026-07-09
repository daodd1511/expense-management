import { APP_COMMIT, APP_COMMIT_DATE, APP_VERSION } from '@/core/appVersion'
import { useLang } from '@/core/i18n'
import { Card } from '@/shared/components/ui/card'

export function AppVersionRow() {
  const { t } = useLang()

  return (
    <Card className="flex flex-col gap-1 px-5 py-4">
      <p className="text-sm font-medium">{t('settings.version')}</p>
      <p className="text-xs text-muted-foreground">{APP_VERSION} · {APP_COMMIT} · {APP_COMMIT_DATE}</p>
    </Card>
  )
}

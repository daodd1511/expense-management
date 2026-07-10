import { useLang } from '@/core/i18n'
import { usePwaUpdate } from '@/core/PwaUpdateProvider'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

export function AppVersionRow() {
  const { t } = useLang()
  const { needRefresh, updateServiceWorker } = usePwaUpdate()

  if (!needRefresh) return null

  return (
    <Card className="flex items-center justify-between gap-2 px-5 py-4">
      <Button variant="outline" size="sm" onClick={() => void updateServiceWorker(true)}>
        {t('settings.updateAction')}
      </Button>
    </Card>
  )
}

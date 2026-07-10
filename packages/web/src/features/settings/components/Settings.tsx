import { Check, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/components/ThemeProvider'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { useAuth } from '@/features/auth/auth'
import { useLang } from '@/core/i18n'
import type { Lang } from '@/core/types'
import { AppVersionRow } from '@/features/settings/components/AppVersionRow'
import { cn } from '@/shared/lib/utils'

export function SettingsBody() {
  const { theme, setTheme } = useTheme()
  const { t, lang, setLang } = useLang()
  const { user, signOut } = useAuth()

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Appearance */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold">{t('settings.appearance')}</h2>
          <p className="text-sm text-muted-foreground">{t('settings.appearanceDesc')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['light', 'dark'] as const).map((th) => {
            const active = theme === th
            const Icon = th === 'light' ? Sun : Moon
            return (
              <button
                key={th}
                type="button"
                onClick={() => setTheme(th)}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors',
                  active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {th === 'light' ? t('settings.light') : t('settings.dark')}
                </span>
                {active && <Check className="size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Language */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-base font-semibold">{t('settings.language')}</h2>
          <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['vi', 'en'] as Lang[]).map((l) => {
            const active = lang === l
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors',
                  active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                )}
              >
                <span>{l === 'vi' ? t('settings.langVi') : t('settings.langEn')}</span>
                {active && <Check className="size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Account */}
      <Card className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Google</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="size-4" />
          {t('auth.signOut')}
        </Button>
      </Card>

      <AppVersionRow />
    </div>
  )
}

export function DesktopSettings() {
  const { t } = useLang()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>
      <SettingsBody />
    </div>
  )
}

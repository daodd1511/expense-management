
import { DesktopApp } from '@/layouts/desktop/DesktopApp'
import { MobileApp } from '@/layouts/mobile/MobileApp'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'

export function ResponsiveApp() {
  const isDesktop = useIsDesktop()

  if (isDesktop === null) {
    return <div className="min-h-dvh bg-background" />
  }

  return isDesktop ? <DesktopApp /> : <MobileApp />
}

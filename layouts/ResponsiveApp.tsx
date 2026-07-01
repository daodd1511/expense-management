
import { useEffect, useState } from 'react'
import { DesktopApp } from '@/components/desktop/desktop-app'
import { MobileApp } from '@/components/mobile/mobile-app'

const DESKTOP_QUERY = '(min-width: 1024px)'

export function ResponsiveApp() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  if (isDesktop === null) {
    return <div className="min-h-dvh bg-background" />
  }

  return isDesktop ? <DesktopApp /> : <MobileApp />
}

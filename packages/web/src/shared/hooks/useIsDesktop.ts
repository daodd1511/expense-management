import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 1024px)'

/** `null` until the first media-query read completes on the client. */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isDesktop
}

import { createContext, useContext, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { RegisterSWOptions } from 'virtual:pwa-register/react'
import { translate } from '@/core/i18n'

interface PwaUpdateContextValue {
  needRefresh: boolean
  isUpdateToastVisible: boolean
  toggleUpdateToast: () => void
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null)
const UPDATE_TOAST_ID = 'pwa-update-toast'

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const startupToastShownRef = useRef(false)
  const setNeedRefreshRef = useRef<Dispatch<SetStateAction<boolean>> | null>(null)
  const showStartupUpdatePromptRef = useRef<(() => void) | null>(null)
  const [isUpdateToastVisible, setIsUpdateToastVisible] = useState(false)
  const { needRefresh: needRefreshState, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swScriptUrl: string, registration: Parameters<NonNullable<RegisterSWOptions['onRegisteredSW']>>[1]) {
      if (!registration?.waiting) return
      if (showStartupUpdatePromptRef.current) {
        showStartupUpdatePromptRef.current()
        return
      }

      queueMicrotask(() => showStartupUpdatePromptRef.current?.())
    },
  })
  const [needRefresh, setNeedRefresh] = needRefreshState
  setNeedRefreshRef.current = setNeedRefresh
  const showUpdateToast = (markNeedRefresh: boolean) => {
    if (markNeedRefresh) setNeedRefreshRef.current?.(true)
    setIsUpdateToastVisible(true)

    toast(translate('settings.updateReadyTitle'), {
      id: UPDATE_TOAST_ID,
      description: translate('settings.updateReadyBody'),
      duration: Infinity,
      action: {
        label: translate('settings.updateAction'),
        onClick: () => {
          setIsUpdateToastVisible(false)
          void updateServiceWorker(true)
        },
      },
      onDismiss: () => {
        setIsUpdateToastVisible(false)
      },
    })
  }

  showStartupUpdatePromptRef.current = () => {
    if (startupToastShownRef.current) return

    startupToastShownRef.current = true
    showUpdateToast(true)
  }

  const toggleUpdateToast = () => {
    if (isUpdateToastVisible) {
      toast.dismiss(UPDATE_TOAST_ID)
      setIsUpdateToastVisible(false)
      return
    }

    showUpdateToast(false)
  }

  return (
    <PwaUpdateContext.Provider
      value={{ needRefresh, isUpdateToastVisible, toggleUpdateToast, updateServiceWorker }}
    >
      {children}
    </PwaUpdateContext.Provider>
  )
}

export function usePwaUpdate() {
  const context = useContext(PwaUpdateContext)
  if (!context) throw new Error('usePwaUpdate must be used within PwaUpdateProvider')
  return context
}

import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dismissMock, toastMock, setNeedRefreshMock, updateServiceWorkerMock, useRegisterSWMock } = vi.hoisted(() => ({
  dismissMock: vi.fn(),
  toastMock: vi.fn(),
  setNeedRefreshMock: vi.fn(),
  updateServiceWorkerMock: vi.fn().mockResolvedValue(undefined),
  useRegisterSWMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(toastMock, {
    dismiss: dismissMock,
    error: vi.fn(),
  }),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: useRegisterSWMock,
}))

import { LangProvider } from '@/core/i18n'
import { PwaUpdateProvider, usePwaUpdate } from './PwaUpdateProvider'

function ToggleToastProbe() {
  const { toggleUpdateToast } = usePwaUpdate()

  return <button onClick={toggleUpdateToast}>toggle</button>
}

describe('PwaUpdateProvider', () => {
  beforeEach(() => {
    dismissMock.mockReset()
    toastMock.mockReset()
    setNeedRefreshMock.mockReset()
    updateServiceWorkerMock.mockReset()
    updateServiceWorkerMock.mockResolvedValue(undefined)
    useRegisterSWMock.mockReset()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('en'),
      setItem: vi.fn(),
    })
  })

  it('shows a sticky update toast when a waiting worker exists at startup', async () => {
    useRegisterSWMock.mockImplementation((options?: { onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void }) => {
      options?.onRegisteredSW?.('/sw.js', { waiting: {} } as ServiceWorkerRegistration)
      return {
        needRefresh: [false, setNeedRefreshMock],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: updateServiceWorkerMock,
      }
    })

    render(
      <LangProvider>
        <PwaUpdateProvider>
          <div>child</div>
        </PwaUpdateProvider>
      </LangProvider>,
    )

    await waitFor(() => {
      expect(setNeedRefreshMock).toHaveBeenCalledWith(true)
      expect(toastMock).toHaveBeenCalledWith('Update available', expect.objectContaining({
        description: 'A newer build is ready. Update whenever you want to reload the app.',
        duration: Infinity,
        action: expect.objectContaining({ label: 'Update' }),
      }))
    })
  })

  it('does not show a toast when no worker is waiting at startup', () => {
    useRegisterSWMock.mockImplementation((options?: { onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void }) => {
      options?.onRegisteredSW?.('/sw.js', { waiting: null } as unknown as ServiceWorkerRegistration)
      return {
        needRefresh: [false, setNeedRefreshMock],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: updateServiceWorkerMock,
      }
    })

    render(
      <LangProvider>
        <PwaUpdateProvider>
          <div>child</div>
        </PwaUpdateProvider>
      </LangProvider>,
    )

    expect(toastMock).not.toHaveBeenCalled()
  })

  it('toggles the preview toast on and off', async () => {
    const user = userEvent.setup()
    useRegisterSWMock.mockReturnValue({
      needRefresh: [false, setNeedRefreshMock],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: updateServiceWorkerMock,
    })

    const { getByRole } = render(
      <LangProvider>
        <PwaUpdateProvider>
          <ToggleToastProbe />
        </PwaUpdateProvider>
      </LangProvider>,
    )

    await user.click(getByRole('button', { name: 'toggle' }))
    expect(toastMock).toHaveBeenCalledWith('Update available', expect.objectContaining({
      id: 'pwa-update-toast',
    }))

    await user.click(getByRole('button', { name: 'toggle' }))
    expect(dismissMock).toHaveBeenCalledWith('pwa-update-toast')
  })
})

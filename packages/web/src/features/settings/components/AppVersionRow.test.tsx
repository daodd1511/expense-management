import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toggleUpdateToastMock, updateServiceWorkerMock, usePwaUpdateMock } = vi.hoisted(() => ({
  toggleUpdateToastMock: vi.fn(),
  updateServiceWorkerMock: vi.fn().mockResolvedValue(undefined),
  usePwaUpdateMock: vi.fn(),
}))

vi.mock('@/core/PwaUpdateProvider', () => ({
  usePwaUpdate: usePwaUpdateMock,
}))

vi.mock('@/core/appVersion', () => ({
  APP_VERSION: '0.1.0',
  APP_COMMIT: 'abc1234',
  APP_COMMIT_DATE: '2026-07-09',
}))

import { LangProvider } from '@/core/i18n'
import { AppVersionRow } from './AppVersionRow'

describe('AppVersionRow', () => {
  beforeEach(() => {
    toggleUpdateToastMock.mockReset()
    updateServiceWorkerMock.mockReset()
    updateServiceWorkerMock.mockResolvedValue(undefined)
    usePwaUpdateMock.mockReset()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('en'),
      setItem: vi.fn(),
    })
  })

  it('renders the version string without an update button when no refresh is pending', () => {
    usePwaUpdateMock.mockReturnValue({
      isUpdateToastVisible: false,
      needRefresh: false,
      toggleUpdateToast: toggleUpdateToastMock,
      updateServiceWorker: updateServiceWorkerMock,
    })

    render(
      <LangProvider>
        <AppVersionRow />
      </LangProvider>,
    )

    expect(screen.getByText('0.1.0 · abc1234 · 2026-07-09')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Show toast' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull()
  })

  it('toggles the preview toast from Settings', async () => {
    const user = userEvent.setup()
    usePwaUpdateMock.mockReturnValue({
      isUpdateToastVisible: false,
      needRefresh: false,
      toggleUpdateToast: toggleUpdateToastMock,
      updateServiceWorker: updateServiceWorkerMock,
    })

    render(
      <LangProvider>
        <AppVersionRow />
      </LangProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Show toast' }))

    expect(toggleUpdateToastMock).toHaveBeenCalledTimes(1)
  })

  it('shows the update button and applies the waiting worker on click', async () => {
    const user = userEvent.setup()
    usePwaUpdateMock.mockReturnValue({
      isUpdateToastVisible: true,
      needRefresh: true,
      toggleUpdateToast: toggleUpdateToastMock,
      updateServiceWorker: updateServiceWorkerMock,
    })

    render(
      <LangProvider>
        <AppVersionRow />
      </LangProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Hide toast' })).toBeDefined()
  })
})

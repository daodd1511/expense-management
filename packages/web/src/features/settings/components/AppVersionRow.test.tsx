import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { updateServiceWorkerMock, usePwaUpdateMock } = vi.hoisted(() => ({
  updateServiceWorkerMock: vi.fn().mockResolvedValue(undefined),
  usePwaUpdateMock: vi.fn(),
}))

vi.mock('@/core/PwaUpdateProvider', () => ({
  usePwaUpdate: usePwaUpdateMock,
}))

import { LangProvider } from '@/core/i18n'
import { AppVersionRow } from './AppVersionRow'

describe('AppVersionRow', () => {
  beforeEach(() => {
    updateServiceWorkerMock.mockReset()
    updateServiceWorkerMock.mockResolvedValue(undefined)
    usePwaUpdateMock.mockReset()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('en'),
      setItem: vi.fn(),
    })
  })

  it('renders nothing when no refresh is pending', () => {
    usePwaUpdateMock.mockReturnValue({
      needRefresh: false,
      updateServiceWorker: updateServiceWorkerMock,
    })

    const { container } = render(
      <LangProvider>
        <AppVersionRow />
      </LangProvider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('shows the update button and applies the waiting worker on click', async () => {
    const user = userEvent.setup()
    usePwaUpdateMock.mockReturnValue({
      needRefresh: true,
      updateServiceWorker: updateServiceWorkerMock,
    })

    render(
      <LangProvider>
        <AppVersionRow />
      </LangProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(updateServiceWorkerMock).toHaveBeenCalledWith(true)
  })
})

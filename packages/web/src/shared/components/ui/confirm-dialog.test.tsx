import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './confirm-dialog'

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        'confirm.deleteTitle': 'Delete this item?',
        'confirm.deleteMessage': 'This action cannot be undone.',
        'confirm.cancel': 'Cancel',
        'confirm.delete': 'Delete',
        'confirm.deleting': 'Deleting...',
      })[key] ?? key,
  }),
}))

describe('ConfirmDialog', () => {
  it('shows a loading label and disables controls while confirm is pending', async () => {
    const user = userEvent.setup()
    let resolveConfirm!: () => void
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve
        }),
    )
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        open
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Deleting...' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).not.toHaveBeenCalled()

    await act(async () => {
      resolveConfirm()
    })
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountForm } from './AccountForm'

vi.mock('@/core/i18n', () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        'accounts.kind': 'Account type',
        'accounts.kindCash': 'Cash',
        'accounts.kindBank': 'Bank',
        'accounts.kindCard': 'Credit card',
        'accounts.kindEwallet': 'E-wallet',
        'accounts.name': 'Account name',
        'accounts.namePlaceholder': 'e.g. Savings',
        'accounts.balance': 'Opening balance',
        'accounts.save': 'Save changes',
        'accounts.create': 'Create account',
        'form.cancel': 'Cancel',
      })[key] ?? key,
  }),
  translate: (key: string) => key,
}))

describe('AccountForm', () => {
  it('shows opening balance when creating an account', () => {
    render(<AccountForm onSubmit={vi.fn().mockResolvedValue(undefined)} onCancel={vi.fn()} />)

    expect(screen.getByLabelText('Opening balance')).toBeDefined()
  })

  it('hides opening balance and preserves it when editing an account', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <AccountForm
        initial={{ id: 'account-1', name: 'Checking', kind: 'bank', openingBalance: 1_000, balance: 1_200 }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('Opening balance')).toBeNull()

    await user.clear(screen.getByLabelText('Account name'))
    await user.type(screen.getByLabelText('Account name'), 'Updated checking')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Updated checking',
        kind: 'bank',
        openingBalance: 1_000,
      })
    })
  })
})

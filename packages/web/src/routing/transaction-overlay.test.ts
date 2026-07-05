import { describe, expect, it } from 'vitest'
import {
  getTransactionOverlayState,
  normalizeTransactionReturnTo,
  validateTransactionOverlaySearch,
} from './transaction-overlay'

describe('transaction overlay routing', () => {
  it('parses create overlays and preserves an app return target', () => {
    expect(
      getTransactionOverlayState('/transactions/new', { returnTo: '/accounts' }),
    ).toEqual({
      mode: 'create',
      returnTo: '/accounts',
      returnToPathname: '/accounts',
    })
  })

  it('parses edit overlays and decodes the transaction id', () => {
    expect(
      getTransactionOverlayState('/transactions/tx%201/edit', { returnTo: '/settings/categories' }),
    ).toEqual({
      mode: 'edit',
      transactionId: 'tx 1',
      returnTo: '/settings/categories',
      returnToPathname: '/settings/categories',
    })
  })

  it('falls back to /transactions for auth or overlay return targets', () => {
    expect(normalizeTransactionReturnTo('/auth/sign-in')).toBe('/transactions')
    expect(normalizeTransactionReturnTo('/transactions/new')).toBe('/transactions')
    expect(
      validateTransactionOverlaySearch({ returnTo: 'https://evil.example/accounts' }),
    ).toEqual({ returnTo: '/' })
  })
})

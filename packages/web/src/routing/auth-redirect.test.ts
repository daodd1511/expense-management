import { beforeEach, describe, expect, it } from 'vitest'
import { currentRedirectPath, normalizeRedirectPath, validateAuthSearch } from './auth-redirect'

describe('auth redirect helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('keeps same-origin relative redirects', () => {
    expect(normalizeRedirectPath('/transactions?view=all#top')).toBe('/transactions?view=all#top')
  })

  it('drops cross-origin redirects to root', () => {
    expect(normalizeRedirectPath('https://evil.example/phish')).toBe('/')
  })

  it('validates redirect search into a normalized shape', () => {
    expect(validateAuthSearch({ redirect: '/settings/categories' })).toEqual({
      redirect: '/settings/categories',
    })
  })

  it('reads the current location into a redirect path', () => {
    window.history.replaceState({}, '', '/auth/sign-in?redirect=%2Faccounts#section')

    expect(currentRedirectPath()).toBe('/auth/sign-in?redirect=%2Faccounts#section')
  })
})

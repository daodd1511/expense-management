import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import type { TranslationKey } from '@/core/i18n'

export class AppAuthError extends Error {
  translationKey: TranslationKey

  constructor(translationKey: TranslationKey, message?: string) {
    super(message ?? translationKey)
    this.name = 'AppAuthError'
    this.translationKey = translationKey
  }
}

function hasMessage(error: unknown): error is { message: string } {
  return !!error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
}

function hasCode(error: unknown): error is { code: string } {
  return !!error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
}

function classifyByMessage(message: string): TranslationKey {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) return 'auth.errorInvalidCredentials'
  if (lower.includes('user already registered')) return 'auth.errorEmailInUse'
  if (lower.includes('already been registered')) return 'auth.errorEmailInUse'
  if (lower.includes('already exists')) return 'auth.errorEmailInUse'
  if (lower.includes('password should be at least')) return 'auth.errorWeakPassword'
  if (lower.includes('password is too weak')) return 'auth.errorWeakPassword'
  if (lower.includes('invalid token')) return 'auth.errorInvalidResetLink'
  if (lower.includes('token has expired')) return 'auth.errorInvalidResetLink'
  if (lower.includes('otp expired')) return 'auth.errorInvalidResetLink'
  if (lower.includes('session not found')) return 'auth.errorInvalidResetLink'
  if (lower.includes('email rate limit exceeded')) return 'auth.errorEmailRateLimit'

  return 'auth.errorGeneric'
}

function classifyByCode(code: string): TranslationKey | null {
  switch (code) {
    case 'invalid_credentials':
      return 'auth.errorInvalidCredentials'
    case 'email_exists':
      return 'auth.errorEmailInUse'
    case 'weak_password':
      return 'auth.errorWeakPassword'
    case 'otp_expired':
      return 'auth.errorInvalidResetLink'
    case 'over_email_send_rate_limit':
      return 'auth.errorEmailRateLimit'
    default:
      return null
  }
}

/** Normalizes provider-auth failures into stable app-owned translation keys. */
export function toAppAuthError(error: unknown): AppAuthError {
  if (error instanceof AppAuthError) return error

  if (hasCode(error)) {
    const key = classifyByCode(error.code)
    if (key) return new AppAuthError(key, hasMessage(error) ? error.message : undefined)
  }

  if (hasMessage(error)) {
    return new AppAuthError(classifyByMessage(error.message), error.message)
  }

  return new AppAuthError('auth.errorGeneric')
}

export type SupabaseLikeAuthError = SupabaseAuthError | Error

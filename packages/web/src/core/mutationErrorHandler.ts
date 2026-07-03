import { toast } from 'sonner'
import { ApiError } from '@/core/api'
import { translate } from '@/core/i18n'

/**
 * `MutationCache.onError` handler — shows a generic toast for every failed mutation,
 * with copy selected by status family rather than surfacing the backend's raw message
 * (see specs/error-handling/PLAN.md's "FE: error message text" decision).
 */
export function handleMutationError(error: unknown) {
  const isClientError = error instanceof ApiError && error.status < 500
  toast.error(translate(isClientError ? 'error.badRequest' : 'error.server'))
}

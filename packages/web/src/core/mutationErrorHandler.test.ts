import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { ApiError } from '@/core/api'
import { handleMutationError } from './mutationErrorHandler'

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('@/core/i18n', () => ({
  translate: (key: string) => key,
}))

describe('handleMutationError', () => {
  it('shows the badRequest message for a 4xx ApiError', () => {
    handleMutationError(new ApiError('Invalid request body', 400))

    expect(toast.error).toHaveBeenCalledWith('error.badRequest')
  })

  it('shows a field validation message for a 4xx ApiError with field errors', () => {
    handleMutationError(
      new ApiError('Invalid request body', 400, {
        fieldErrors: { date: ['Transaction date cannot be in the future'] },
      }),
    )

    expect(toast.error).toHaveBeenCalledWith('Transaction date cannot be in the future')
  })

  it('shows the server message for a 5xx ApiError', () => {
    handleMutationError(new ApiError('Internal server error', 500))

    expect(toast.error).toHaveBeenCalledWith('error.server')
  })

  it('shows the server message for a non-ApiError (e.g. network failure)', () => {
    handleMutationError(new TypeError('Failed to fetch'))

    expect(toast.error).toHaveBeenCalledWith('error.server')
  })
})

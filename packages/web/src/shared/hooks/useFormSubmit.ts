import { useCallback, useState } from 'react'
import { isClientError } from '@/core/api'
import { translate } from '@/core/i18n'

/**
 * Wraps an async form submit handler with local pending/error state. On failure the
 * form stays mounted (caller controls that by not closing on error) and `errorMessage`
 * is set for an inline banner — the global toast (wired via `MutationCache.onError`)
 * fires independently of this hook.
 */
export function useFormSubmit<T>(onSubmit: (data: T) => Promise<void>) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submit = useCallback(
    (data: T) => {
      setErrorMessage(null)
      setIsSubmitting(true)
      onSubmit(data)
        .catch((error: unknown) => {
          setErrorMessage(translate(isClientError(error) ? 'error.badRequest' : 'error.server'))
        })
        .finally(() => setIsSubmitting(false))
    },
    [onSubmit],
  )

  return { submit, isSubmitting, errorMessage }
}

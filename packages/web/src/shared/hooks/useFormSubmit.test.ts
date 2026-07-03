import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/core/api'
import { useFormSubmit } from './useFormSubmit'

vi.mock('@/core/i18n', () => ({
  translate: (key: string) => key,
}))

describe('useFormSubmit', () => {
  it('clears errorMessage and calls onSubmit on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useFormSubmit(onSubmit))

    act(() => result.current.submit({ name: 'test' }))

    await waitFor(() => expect(result.current.isSubmitting).toBe(false))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'test' })
    expect(result.current.errorMessage).toBeNull()
  })

  it('sets errorMessage to the badRequest copy on a 4xx ApiError', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('Invalid request body', 400))
    const { result } = renderHook(() => useFormSubmit(onSubmit))

    act(() => result.current.submit({ name: 'test' }))

    await waitFor(() => expect(result.current.errorMessage).toBe('error.badRequest'))
  })

  it('sets errorMessage to the server copy on a 5xx ApiError', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('Internal server error', 500))
    const { result } = renderHook(() => useFormSubmit(onSubmit))

    act(() => result.current.submit({ name: 'test' }))

    await waitFor(() => expect(result.current.errorMessage).toBe('error.server'))
  })

  it('clears a previous errorMessage on the next submit attempt', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new ApiError('boom', 500)).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useFormSubmit(onSubmit))

    act(() => result.current.submit({ name: 'first' }))
    await waitFor(() => expect(result.current.errorMessage).toBe('error.server'))

    act(() => result.current.submit({ name: 'second' }))
    await waitFor(() => expect(result.current.errorMessage).toBeNull())
  })
})

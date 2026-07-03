import { z } from 'zod'
import { supabase } from '@/core/supabase'

const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
})

/** Thrown by `apiFetch` on any non-2xx response (or a missing auth session, as 401). */
export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * Client (4xx, user-fixable) vs. server (5xx, or a non-`ApiError` failure like a
 * network drop) — used to pick between `error.badRequest`/`error.server` copy.
 * Shared by the global toast handler and per-form inline error state so both
 * classify failures the same way.
 */
export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status < 500
}

function apiBase() {
  return import.meta.env.VITE_API_BASE ?? '/api'
}

export async function apiFetch(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new ApiError('Missing auth session', 401)
  }

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `API request failed: ${response.status}`
    let details: unknown
    try {
      const body = apiErrorSchema.parse(await response.json())
      message = body.error
      details = body.details
    } catch {
      // keep fallback message
    }
    throw new ApiError(message, response.status, details)
  }

  return response
}

export async function apiJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  const json = await response.json()
  return schema.parse(json)
}

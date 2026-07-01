import { z } from 'zod'
import { supabase } from '@/core/supabase'

const apiErrorSchema = z.object({
  error: z.string(),
})

function apiBase() {
  return import.meta.env.VITE_API_BASE ?? '/api'
}

export async function apiFetch(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Missing auth session')
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
    try {
      const body = apiErrorSchema.parse(await response.json())
      message = body.error
    } catch {
      // keep fallback message
    }
    throw new Error(message)
  }

  return response
}

export async function apiJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  const json = await response.json()
  return schema.parse(json)
}

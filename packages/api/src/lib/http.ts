import type { Context } from 'hono'
import { secureParse } from '@wallet/shared'
import type { ZodSchema } from 'zod'

type ApiErrorStatus = 400 | 401 | 404 | 500

export function jsonError(c: Context, status: ApiErrorStatus, error: string, details?: unknown) {
  return c.json(
    {
      error,
      ...(details !== undefined && { details }),
    },
    status,
  )
}

export async function parseJsonBody<T>(
  c: Context,
  schema: ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return { success: false, response: jsonError(c, 400, 'Invalid JSON body') }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      success: false,
      response: jsonError(c, 400, 'Invalid request body', result.error.flatten()),
    }
  }

  return { success: true, data: result.data }
}

export function parseRows<TParsed, TMapped>(
  rows: unknown[] | null,
  schema: ZodSchema<TParsed>,
  map: (row: TParsed) => TMapped,
) {
  return (rows ?? [])
    .map((row) => secureParse(schema, row))
    .filter((row): row is TParsed => row !== null)
    .map(map)
}

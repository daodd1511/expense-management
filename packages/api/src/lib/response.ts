import { secureParse } from '@wallet/shared'
import type { Context } from 'hono'
import type { ZodSchema } from 'zod'

export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 500

export function jsonError(c: Context, status: ApiErrorStatus, error: string, details?: unknown) {
  return c.json(
    {
      error,
      ...(details !== undefined && { details }),
    },
    status,
  )
}

/**
 * Parses a request body as JSON without validating it against a schema.
 * Shared by `parseJsonBody` and routes that need the raw payload first.
 */
export async function parseRawJsonBody(
  c: Context,
): Promise<{ success: true; data: unknown } | { success: false; response: Response }> {
  try {
    return { success: true, data: await c.req.json() }
  } catch {
    return { success: false, response: jsonError(c, 400, 'Invalid JSON body') }
  }
}

export async function parseJsonBody<T>(
  c: Context,
  schema: ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const raw = await parseRawJsonBody(c)
  if (!raw.success) return raw

  const result = schema.safeParse(raw.data)
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

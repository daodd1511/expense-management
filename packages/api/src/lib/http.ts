import type { Context } from 'hono'
import { secureParse } from '@wallet/shared'
import type { ZodSchema } from 'zod'

type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 500

export function jsonError(c: Context, status: ApiErrorStatus, error: string, details?: unknown) {
  return c.json(
    {
      error,
      ...(details !== undefined && { details }),
    },
    status,
  )
}

/** Minimal shape of a Supabase/PostgREST error — only the fields `mapDbError` branches on. */
export type DbError = { code: string; message: string }

/**
 * Translates a Supabase/PostgREST error into an HTTP response, mapping known
 * Postgres error codes to meaningful statuses instead of collapsing everything to a
 * generic 500. The raw Postgres message is never sent to the client (only logged
 * server-side) since it can contain internal details like table/constraint names.
 */
export function mapDbError(c: Context, error: DbError) {
  if (error.code === '23505') {
    console.error('[db] unique constraint violation:', error)
    return jsonError(c, 409, 'This item already exists')
  }
  if (error.code === '23503') {
    console.error('[db] foreign key violation:', error)
    return jsonError(c, 409, 'This action conflicts with related data')
  }
  console.error('[db] unexpected error:', error)
  return jsonError(c, 500, 'Internal server error')
}

/**
 * Parses a request body as JSON without validating it against a schema. Shared by
 * `parseJsonBody` and by handlers that need to inspect the raw body before schema
 * validation (e.g. rejecting an immutable field with a specific message, rather than
 * letting a schema silently strip it).
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

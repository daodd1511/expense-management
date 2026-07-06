import type { Context } from 'hono'
import { jsonError, parseJsonBody, parseRawJsonBody, parseRows } from './response'

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

export { jsonError, parseJsonBody, parseRawJsonBody, parseRows }

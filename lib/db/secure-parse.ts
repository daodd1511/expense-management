import type { ZodSchema } from 'zod'

/** Safe Zod parse — returns null on failure instead of throwing. */
export function secureParse<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[secureParse] Validation failed:', result.error.issues)
    return null
  }
  return result.data
}

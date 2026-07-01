import { z } from 'zod'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function normalizeIsoDateInput(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  if (isoDatePattern.test(trimmedValue)) {
    return trimmedValue
  }

  const datePrefix = trimmedValue.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmedValue) && isoDatePattern.test(datePrefix)) {
    return datePrefix
  }

  return value
}

export const isoDateSchema = z.preprocess(
  normalizeIsoDateInput,
  z.string().regex(isoDatePattern),
)
export const monthFilterSchema = z.string().regex(/^\d{4}-\d{2}$/)

export function atLeastOneKey<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
}

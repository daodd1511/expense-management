import { createMiddleware } from 'hono/factory'
import { jsonError } from '../lib/response'
import { verifyAccessToken } from '../lib/jwt'

export type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return jsonError(c, 401, 'Unauthorized')
  }
  const token = header.slice(7)
  try {
    const userId = await verifyAccessToken(token)

    if (typeof userId !== 'string' || userId.length === 0) {
      return jsonError(c, 401, 'Invalid token')
    }
    c.set('userId', userId)
  } catch {
    return jsonError(c, 401, 'Invalid token')
  }
  await next()
})

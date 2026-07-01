import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = header.slice(7)
  try {
    const payload = await verify(token, process.env.SUPABASE_JWT_SECRET!, 'HS256')
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return c.json({ error: 'Invalid token' }, 401)
    }
    c.set('userId', payload.sub)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
  await next()
})

import type { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export type AuthEnv = {
  Variables: {
    userId: string
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c: Context, next: Next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = header.slice(7)
  try {
    const payload = await verify(token, process.env.SUPABASE_JWT_SECRET!)
    c.set('userId', payload.sub as string)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
  await next()
})

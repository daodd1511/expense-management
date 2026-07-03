import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { jsonError } from '../lib/http'

export type AuthEnv = {
  Variables: {
    userId: string
  }
}

let projectJwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getSupabaseUrl() {
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL')
  }

  return supabaseUrl
}

function getProjectJwks() {
  if (!projectJwks) {
    const supabaseUrl = getSupabaseUrl()
    projectJwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  }

  return projectJwks
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return jsonError(c, 401, 'Unauthorized')
  }
  const token = header.slice(7)
  try {
    const supabaseUrl = getSupabaseUrl()
    const { payload } = await jwtVerify(token, getProjectJwks(), {
      issuer: `${supabaseUrl}/auth/v1`,
    })

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return jsonError(c, 401, 'Invalid token')
    }
    c.set('userId', payload.sub)
  } catch {
    return jsonError(c, 401, 'Invalid token')
  }
  await next()
})

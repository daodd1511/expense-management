import { createRemoteJWKSet, jwtVerify } from 'jose'
import { getEnv } from '../config/env'

let projectJwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getProjectJwks() {
  if (!projectJwks) {
    const { supabaseUrl } = getEnv()
    projectJwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  }

  return projectJwks
}

/** Verifies a Supabase access token and returns its `sub` claim when valid. */
export async function verifyAccessToken(token: string) {
  const { supabaseUrl } = getEnv()
  const { payload } = await jwtVerify(token, getProjectJwks(), {
    issuer: `${supabaseUrl}/auth/v1`,
  })

  return payload.sub
}

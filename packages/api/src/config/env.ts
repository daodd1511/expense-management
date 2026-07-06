type Env = Readonly<{
  port: number
  supabaseUrl: string
  supabaseSecretKey: string
}>

let cachedEnv: Env | null = null

function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}`)
  }

  return value
}

/** Returns the API runtime environment with the same defaults the old bootstrap used. */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv
  }

  cachedEnv = {
    port: Number(process.env.PORT ?? 3000),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }

  return cachedEnv
}

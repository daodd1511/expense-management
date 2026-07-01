import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@wallet/shared'

let supabase: SupabaseClient<Database> | null = null

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
}

export function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const secretKey = getSupabaseSecretKey()

  if (!supabaseUrl || !secretKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  }

  if (!supabase) {
    // Secret key stays server-side and maps to the service_role database role.
    supabase = createClient<Database>(supabaseUrl, secretKey)
  }

  return supabase
}

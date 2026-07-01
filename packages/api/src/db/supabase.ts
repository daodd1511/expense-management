import { createClient } from '@supabase/supabase-js'
import type { Database } from '@wallet/shared'

// Service role key - never sent to browser
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

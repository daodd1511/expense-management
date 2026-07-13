import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@wallet/shared";
import { getEnv } from "./env";

let supabase: SupabaseClient<Database> | null = null;

/** Returns the singleton Supabase service-role client used by the API process. */
export function getSupabase() {
  if (!supabase) {
    const env = getEnv();

    // Secret key stays server-side and maps to the service_role database role.
    supabase = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey);
  }

  return supabase;
}

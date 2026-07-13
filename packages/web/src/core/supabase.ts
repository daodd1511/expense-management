import { createClient } from "@supabase/supabase-js";
import type { Database } from "@wallet/shared";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
);

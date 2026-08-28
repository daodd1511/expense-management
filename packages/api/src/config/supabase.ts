/** Retained only until Phase 5 deletes the Supabase package and legacy module. */
export function getSupabase(): never {
  throw new Error("Supabase runtime access has been removed");
}

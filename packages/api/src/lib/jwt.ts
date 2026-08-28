/** Retained only until Phase 5 deletes the Supabase/Jose packages and legacy module. */
export async function verifyAccessToken(_token: string): Promise<never> {
  throw new Error("Supabase JWT verification has been removed");
}

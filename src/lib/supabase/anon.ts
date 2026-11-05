import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client without a user session — for embed endpoints called from
 * Notion iframes, where login cookies are unreliable. Only calls
 * security-definer RPCs (see supabase/migrations/0005_embed_results.sql).
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

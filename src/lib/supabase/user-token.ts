import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client acting as the user who owns `token` (RLS and auth.uid() apply).
 * For endpoints called from Notion iframes, where login cookies are unreliable.
 */
export function createUserClient(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Supabase client for pages opened inside Notion iframes.
 * Cookies are third-party there and often blocked, so the session lives in
 * localStorage (partitioned per embedding site, shared by all embeds of Notion).
 * If storage is blocked, supabase-js falls back to memory: login lasts for the page view.
 * No URL session detection — the e-mail links go through /auth/confirm on the main site.
 */
export function embedSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'ww-embed-auth',
        },
      }
    );
  }
  return client;
}

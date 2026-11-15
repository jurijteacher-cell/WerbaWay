import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Службовий клієнт (service role) — обходить RLS. Лише на сервері й лише після перевірки,
 * що запит робить викладач. Зараз потрібен для одного: email учня лежить у auth.users,
 * а не в profiles.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

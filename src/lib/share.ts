import { createClient } from '@/lib/supabase/server';

/** Лекція за публічним токеном (lecture_shares; гість читає лише через функцію open_lecture_share) */
export async function sharedSlug(token: string, count = false): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return null;
  const { data, error } = await createClient().rpc('open_lecture_share', { p_token: token, p_count: count });
  return error ? null : ((data as string | null) ?? null);
}

import { createClient } from '@/lib/supabase/server';
import { fetchHidden } from '@/lib/pages/trash';

/** Лекція за публічним токеном (lecture_shares; гість читає лише через функцію open_lecture_share) */
export async function sharedSlug(token: string, count = false): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc('open_lecture_share', { p_token: token, p_count: count });
  const slug = error ? null : ((data as string | null) ?? null);
  // лекція в кошику за посиланням не відкривається
  if (slug && (await fetchHidden(supabase)).has(slug)) return null;
  return slug;
}

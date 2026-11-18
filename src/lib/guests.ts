import type { SupabaseClient } from '@supabase/supabase-js';
import { listPages } from '@/lib/pages/pages';
import type { Locale } from '@/i18n/config';

/**
 * Гості за публічними посиланнями — браузери без акаунта (кука ww_vid, 0016_guests.sql).
 * Видно те саме, що й про учня: які лекції відкривав, скільки часу, скільки відповідей
 * і з якою точністю. Після реєстрації гість зникає з цього списку (claimed_by) —
 * його історія вже в учня.
 */
export type GuestRow = {
  vid: string;
  num: number;
  ua: string | null;
  firstSeen: string;
  lastSeen: string;
  seconds: number;
  attempts: number;
  accuracy: number | null;
  /** лекції, які відкривав: найсвіжіша перша */
  lessons: { slug: string; title: string }[];
  /** якщо вже зареєструвався — id акаунта (такі в список не потрапляють) */
  claimedBy: string | null;
};

export async function loadGuests(supabase: SupabaseClient, locale?: Locale, days = 14): Promise<GuestRow[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data: stats } = await supabase
    .from('guest_visitor_stats')
    .select('id, num, ua, first_seen, last_seen, seconds, attempts, first_total, first_ok, claimed_by')
    .is('claimed_by', null)
    .gte('last_seen', since)
    .order('last_seen', { ascending: false })
    .limit(40);
  if (!stats?.length) return [];

  const ids = stats.map((g) => g.id as string);
  const { data: views } = await supabase
    .from('guest_views')
    .select('visitor_id, lesson_slug, last_at')
    .in('visitor_id', ids)
    .order('last_at', { ascending: false });
  const titleOf = new Map(listPages(locale).map((p) => [p.slug, p.title]));
  const bySlug = new Map<string, { slug: string; title: string }[]>();
  for (const v of views ?? []) {
    const slug = v.lesson_slug as string;
    const list = bySlug.get(v.visitor_id as string) ?? [];
    list.push({ slug, title: titleOf.get(slug) ?? slug });
    bySlug.set(v.visitor_id as string, list);
  }

  return stats.map((g) => {
    const total = (g.first_total as number) ?? 0;
    return {
      vid: g.id as string,
      num: g.num as number,
      ua: (g.ua as string) ?? null,
      firstSeen: g.first_seen as string,
      lastSeen: g.last_seen as string,
      seconds: (g.seconds as number) ?? 0,
      attempts: (g.attempts as number) ?? 0,
      accuracy: total ? Math.round((((g.first_ok as number) ?? 0) / total) * 100) : null,
      lessons: bySlug.get(g.id as string) ?? [],
      claimedBy: (g.claimed_by as string) ?? null,
    };
  });
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listPages } from '@/lib/pages/pages';
import { getLocale } from '@/i18n/server';
import { loadDeck, type Word, type WordStat } from '@/lib/words';
import { loadMyDecks, MY_SLUG } from '@/lib/my-words';
import { t } from '@/i18n/server';
import { WordGame } from '@/components/words/WordGame';

export const dynamic = 'force-dynamic';

export default async function PlayPage({ searchParams }: { searchParams?: { decks?: string; mode?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/words')}`);

  const asked = (searchParams?.decks ?? '').split(',').filter(Boolean).slice(0, 20);
  // Учневі — лише колоди пройдених лекцій (як у папці «Слова»); викладач бачить усі
  const [{ data: profile }, { data: done }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('lesson_progress').select('lesson_slug').eq('student_id', user.id),
  ]);
  const allowed = new Set((done ?? []).map((r) => r.lesson_slug as string));
  const mineAsked = asked.filter((s) => MY_SLUG.test(s));
  const lectureAsked = asked.filter((s) => !MY_SLUG.test(s));
  const slugs = [...(profile?.role === 'teacher' ? lectureAsked : lectureAsked.filter((s) => allowed.has(s))), ...mineAsked];
  const myDecks = new Map((mineAsked.length ? await loadMyDecks(supabase, user.id, (n) => t('Мої слова · {n}', { n })) : []).map((d) => [d.slug, d]));
  const titles = new Map(listPages(getLocale()).map((p) => [p.slug, p.title]));
  const words: Word[] = [];
  const names: string[] = [];
  for (const s of slugs) {
    const d = MY_SLUG.test(s) ? myDecks.get(s) ?? null : loadDeck(s, titles.get(s));
    if (d) {
      words.push(...d.words);
      names.push(d.title);
    }
  }
  if (!words.length) redirect('/words');

  const { data: vp } = await supabase
    .from('vocab_progress')
    .select('lesson_slug, word_id, known, seen, correct')
    .eq('student_id', user.id)
    .in('lesson_slug', slugs);
  const stats: Record<string, WordStat> = {};
  for (const r of vp ?? [])
    stats[`${r.lesson_slug}:${r.word_id}`] = { known: !!r.known, seen: Number(r.seen) || 0, correct: Number(r.correct) || 0 };

  const mode = searchParams?.mode === 'match' || searchParams?.mode === 'quiz' ? searchParams.mode : 'cards';
  return <WordGame words={words} deckNames={names} initialStats={stats} initialMode={mode} />;
}

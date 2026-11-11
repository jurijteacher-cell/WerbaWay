import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listPages } from '@/lib/pages/pages';
import { loadDeck, type Word, type WordStat } from '@/lib/words';
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
  const slugs = profile?.role === 'teacher' ? asked : asked.filter((s) => allowed.has(s));
  const titles = new Map(listPages().map((p) => [p.slug, p.title]));
  const words: Word[] = [];
  const names: string[] = [];
  for (const s of slugs) {
    const d = loadDeck(s, titles.get(s));
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

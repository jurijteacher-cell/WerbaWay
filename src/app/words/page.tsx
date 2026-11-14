import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listPages } from '@/lib/pages/pages';
import { getLocale, t } from '@/i18n/server';
import { loadDeck } from '@/lib/words';
import { DeckPicker, type DeckInfo } from '@/components/words/DeckPicker';

export const dynamic = 'force-dynamic';

export default async function WordsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/words');

  const [{ data: profile }, { data: done }, { data: vp }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('lesson_progress').select('lesson_slug, completed_at').eq('student_id', user.id),
    supabase.from('vocab_progress').select('lesson_slug, word_id, known').eq('student_id', user.id),
  ]);
  const isTeacher = profile?.role === 'teacher';

  // Колода з'являється в папці учня, коли викладач завершив лекцію (викладач бачить усі — щоб перевіряти)
  const pages = listPages(getLocale());
  const doneAt = new Map((done ?? []).map((r) => [r.lesson_slug as string, r.completed_at as string]));
  const known = new Map<string, number>();
  for (const r of vp ?? []) if (r.known) known.set(r.lesson_slug as string, (known.get(r.lesson_slug as string) ?? 0) + 1);

  const decks: DeckInfo[] = [];
  for (const p of pages) {
    if (!isTeacher && !doneAt.has(p.slug)) continue;
    const d = loadDeck(p.slug, p.title);
    if (!d || !d.words.length) continue;
    decks.push({
      slug: p.slug,
      title: p.title,
      level: p.level ?? null,
      icon: p.icon ?? null,
      cover: p.cover ?? null,
      total: d.words.length,
      known: Math.min(known.get(p.slug) ?? 0, d.words.length),
      groups: d.groups,
      addedAt: doneAt.get(p.slug) ?? null,
    });
  }
  decks.sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''));

  return (
    <main className="mx-auto max-w-4xl px-4 py-14">
      <p className="ww-label">Werba Way</p>
      <h1 className="mb-2 font-display text-4xl text-paper">{t("Слова")}</h1>
      <p className="mb-8 max-w-2xl text-paper-muted">
        Колоди з пройдених лекцій. Обери одну чи кілька, перемішай, злий в одну й тренуй: картки, пари або тест. Познач слова, які
        вже запам’ятав, — вони не заважатимуть.
      </p>
      <DeckPicker decks={decks} />
    </main>
  );
}

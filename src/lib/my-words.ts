import type { SupabaseClient } from '@supabase/supabase-js';
import type { Deck, Word } from '@/lib/words';

/** «Мої колоди»: слова, які додав сам власник або викладач у класі. По 20 слів у колоді; заповнилась — нова. */
export const MY_DECK_SIZE = 20;
export const MY_SLUG = /^my-[1-9][0-9]{0,3}$/;

export type MyWord = {
  id: string;
  student_id: string;
  deck_no: number;
  term: string;
  forms: string | null;
  translation: string;
  tr_lang: 'uk' | 'ru' | 'en' | 'pl';
  example: string | null;
  example_tr: string | null;
  note: string | null;
  source: 'ai' | 'ai-edited' | 'manual';
  created_by: string;
  created_at: string;
};

export const myDeckSlug = (n: number) => `my-${n}`;

export const toWord = (w: MyWord): Word => ({
  key: `${myDeckSlug(w.deck_no)}:${w.id}`,
  slug: myDeckSlug(w.deck_no),
  id: w.id,
  term: w.term,
  tr: w.translation,
  def: '',
  ex: w.example ?? '',
  pos: w.forms ?? '',
  group: '',
});

/** Колоди власника (student_id): `my-1`, `my-2`… у порядку номерів. */
export async function loadMyDecks(supabase: SupabaseClient, ownerId: string, title: (n: number) => string): Promise<Deck[]> {
  const { data } = await supabase
    .from('student_words')
    .select('*')
    .eq('student_id', ownerId)
    .is('deleted_at', null)
    .order('deck_no', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(2000);
  const by = new Map<number, Word[]>();
  for (const w of (data ?? []) as MyWord[]) by.set(w.deck_no, [...(by.get(w.deck_no) ?? []), toWord(w)]);
  return [...by.entries()].map(([n, words]) => ({ slug: myDeckSlug(n), title: title(n), groups: [], words }));
}

/** До якої колоди піде нове слово: остання, якщо в ній < 20, інакше наступна. */
export async function nextDeckNo(supabase: SupabaseClient, ownerId: string): Promise<number> {
  const { data: last } = await supabase
    .from('student_words')
    .select('deck_no')
    .eq('student_id', ownerId)
    .is('deleted_at', null)
    .order('deck_no', { ascending: false })
    .limit(1);
  const n = (last?.[0]?.deck_no as number | undefined) ?? 1;
  const { count } = await supabase
    .from('student_words')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', ownerId)
    .eq('deck_no', n)
    .is('deleted_at', null);
  return (count ?? 0) >= MY_DECK_SIZE ? n + 1 : n;
}

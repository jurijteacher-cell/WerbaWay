import { listPages, listTeacherPages, loadPage, groupByCourse, type PageMeta } from '@/lib/pages/pages';
import { loadDeck, type Word } from '@/lib/words';

/** текст без розмітки: теги й сутності → пробіли, пробіли стиснуті */
function plain(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** посимвольне згортання (довжина зберігається): малі літери, без діакритики */
function fold(s: string): string {
  return [...s]
    .map((c) => c.toLowerCase().replace('ł', 'l').replace('ё', 'е').normalize('NFD').replace(/[̀-ͯ]/g, '')[0] ?? c)
    .join('');
}

/** «Łódź», «LODZ» і «lodz» шукаються однаково */
export function norm(s: string): string {
  return fold(plain(s));
}

type LectureDoc = { meta: PageMeta; title: string; text: string; raw: string };
type DeckDoc = { slug: string; words: (Word & { n: string })[] };

// індекс будується раз на інстанс сервера: контент лежить у репо й змінюється лише з деплоєм
let lectureIndex: LectureDoc[] | null = null;
let deckIndex: DeckDoc[] | null = null;

export function lectures(): LectureDoc[] {
  if (!lectureIndex) {
    lectureIndex = listPages().map((meta) => {
      const page = loadPage(meta.slug);
      const html = page ? [page.goal ?? '', ...page.sections.flatMap((s) => s.blocks.map((b) => (b.k === 'html' ? b.html : b.title)))].join(' ') : '';
      const raw = plain(html);
      return { meta, title: norm(`${meta.title} ${meta.moduleTitle ?? ''} ${meta.level ?? ''}`), text: fold(raw), raw };
    });
  }
  return lectureIndex;
}

export function decks(): DeckDoc[] {
  if (!deckIndex) {
    deckIndex = listPages()
      .map((p) => loadDeck(p.slug, p.title))
      .filter((d): d is NonNullable<typeof d> => !!d && d.words.length > 0)
      .map((d) => ({ slug: d.slug, words: d.words.map((w) => ({ ...w, n: norm(`${w.term} ${w.tr}`) })) }));
  }
  return deckIndex;
}

export const courses = () => groupByCourse(listPages());
export const teacherNotes = () => listTeacherPages().map((m) => ({ meta: m, n: norm(m.title) }));

/** уривок оригінального тексту навколо збігу (fold зберігає позиції символів) */
export function snippet(doc: { text: string; raw: string }, q: string, len = 90): string {
  const i = doc.text.indexOf(q);
  if (i < 0) return '';
  const chars = [...doc.raw];
  const at = [...doc.text.slice(0, i)].length;
  const start = Math.max(0, at - 35);
  return (start > 0 ? '…' : '') + chars.slice(start, start + len).join('').trim() + '…';
}

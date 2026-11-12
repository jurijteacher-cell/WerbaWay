import { listPages, listTeacherPages, loadPage, groupByCourse, type PageMeta } from '@/lib/pages/pages';
import { loadDeck, type Word } from '@/lib/words';

/** «Łódź», «LODZ» і «лодзь» шукаються однаково: малі літери, без діакритики */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type LectureDoc = { meta: PageMeta; title: string; text: string };
type DeckDoc = { slug: string; words: (Word & { n: string })[] };

// індекс будується раз на інстанс сервера: контент лежить у репо й змінюється лише з деплоєм
let lectureIndex: LectureDoc[] | null = null;
let deckIndex: DeckDoc[] | null = null;

export function lectures(): LectureDoc[] {
  if (!lectureIndex) {
    lectureIndex = listPages().map((meta) => {
      const page = loadPage(meta.slug);
      const html = page ? [page.goal ?? '', ...page.sections.flatMap((s) => s.blocks.map((b) => (b.k === 'html' ? b.html : b.title)))].join(' ') : '';
      return { meta, title: norm(`${meta.title} ${meta.moduleTitle ?? ''} ${meta.level ?? ''}`), text: norm(html) };
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

/** уривок тексту навколо збігу */
export function snippet(text: string, q: string, len = 90): string {
  const i = text.indexOf(q);
  if (i < 0) return '';
  const start = Math.max(0, i - 35);
  return (start > 0 ? '…' : '') + text.slice(start, start + len).trim() + '…';
}

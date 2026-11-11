import { existsSync, readFileSync } from 'fs';
import path from 'path';

/** Колода слів = слова однієї лекції (src/content/queue-published/<slug>-vocab.json). */

export type Word = {
  /** унікальний ключ слова: `${slug}:${id}` */
  key: string;
  slug: string;
  id: string;
  term: string;
  /** переклад (укр.) */
  tr: string;
  def: string;
  ex: string;
  pos: string;
  group: string;
};

export type Deck = { slug: string; title: string; groups: string[]; words: Word[] };

const DIR = path.join(process.cwd(), 'src/content/queue-published');
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function loadDeck(slug: string, title?: string): Deck | null {
  if (!SLUG_RE.test(slug)) return null;
  const f = path.join(DIR, `${slug}-vocab.json`);
  if (!existsSync(f)) return null;
  try {
    const d = JSON.parse(readFileSync(f, 'utf8')) as {
      title?: string;
      groups?: string[];
      items?: Record<string, string>[];
    };
    const words: Word[] = (d.items ?? []).map((it) => ({
      key: `${slug}:${it.id}`,
      slug,
      id: String(it.id),
      term: it.term ?? '',
      tr: it.translation_uk ?? '',
      def: it.definition ?? '',
      ex: it.example ?? '',
      pos: it.part_of_speech ?? '',
      group: it.group ?? '',
    }));
    return { slug, title: title ?? d.title ?? slug, groups: d.groups ?? [], words };
  } catch {
    return null;
  }
}

export type WordStat = { known: boolean; seen: number; correct: number };

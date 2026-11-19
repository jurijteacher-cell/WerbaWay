import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Кошик лекцій (таблиця lecture_trash, міграція 0017).
 *  • у кошику (purged_at = null) — лекцію не бачить ніхто, крім викладача на /teacher/trash;
 *  • видалена назавжди (purged_at) — прихована, поки її файли ще в репо; їх прибирає
 *    GitHub Action (scripts/purge-lectures.mjs) за списком із /api/lectures/purged.
 * Таблиці ще немає (міграцію не застосовано) → кошик порожній, сайт працює як раніше.
 */

export type TrashRow = {
  slug: string;
  deleted_at: string;
  deleted_by: string | null;
  purged_at: string | null;
  file_hash: string | null;
};

const PAGES_DIR = path.join(process.cwd(), 'src/content/pages');
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** sha256 файлу лекції — щоб нова лекція з тим самим slug не лишилась прихованою */
export function pageHash(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return null;
  const file = path.join(PAGES_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** Таблиці немає: Postgres 42P01 або PostgREST PGRST205 */
export function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === 'PGRST205' || /lecture_trash/.test(err.message ?? '');
}

export async function fetchTrash(supabase: SupabaseClient): Promise<TrashRow[]> {
  const { data, error } = await supabase
    .from('lecture_trash')
    .select('slug, deleted_at, deleted_by, purged_at, file_hash')
    .order('deleted_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as TrashRow[];
}

/** Видалена назавжди, але файли цієї самої версії ще на сайті */
export function isPendingPurge(row: TrashRow): boolean {
  return !!row.purged_at && !!row.file_hash && row.file_hash === pageHash(row.slug);
}

/** Що ховати зі списків і сторінок */
export function hiddenSlugs(rows: TrashRow[]): Set<string> {
  return new Set(rows.filter((r) => !r.purged_at || isPendingPurge(r)).map((r) => r.slug));
}

export async function fetchHidden(supabase: SupabaseClient): Promise<Set<string>> {
  return hiddenSlugs(await fetchTrash(supabase));
}

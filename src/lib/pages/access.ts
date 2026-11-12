import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageMeta } from './pages';

/**
 * Хто яку лекцію бачить.
 * Викладач — усе. Учень — курси (модулі) й окремі лекції, які йому відкрив викладач (student_access),
 * плюс лекції, які він уже пройшов у класі (lesson_progress).
 */
export type Access = { isTeacher: boolean; modules: Set<string>; lessons: Set<string> };

export async function getAccess(supabase: SupabaseClient, userId: string): Promise<Access> {
  const [{ data: profile }, { data: grants }, { data: done }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('student_access').select('kind, ref').eq('student_id', userId),
    supabase.from('lesson_progress').select('lesson_slug').eq('student_id', userId),
  ]);
  const modules = new Set<string>();
  const lessons = new Set<string>();
  for (const g of grants ?? []) (g.kind === 'module' ? modules : lessons).add(g.ref as string);
  for (const d of done ?? []) lessons.add(d.lesson_slug as string);
  return { isTeacher: profile?.role === 'teacher', modules, lessons };
}

export function canSee(meta: PageMeta, a: Access): boolean {
  return a.isTeacher || a.lessons.has(meta.slug) || (!!meta.module && a.modules.has(meta.module));
}

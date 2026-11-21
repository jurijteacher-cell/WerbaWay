import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageMeta } from './pages';
import { fetchHidden } from './trash';
import { fetchCourseOverrides, withCourse, type CourseOverrides } from './course';

/**
 * Хто яку лекцію бачить.
 * Викладач — усе. Учень — курси (модулі) й окремі лекції, які йому відкрив викладач (student_access),
 * плюс лекції, які він уже пройшов у класі (lesson_progress).
 * Лекції в кошику (lecture_trash) не бачить ніхто: викладач відкриває їх лише з /teacher/trash.
 */
export type Access = { isTeacher: boolean; modules: Set<string>; lessons: Set<string>; trashed: Set<string>; courses: CourseOverrides };

export async function getAccess(supabase: SupabaseClient, userId: string): Promise<Access> {
  const [{ data: profile }, { data: grants }, { data: done }, trashed, courses] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('student_access').select('kind, ref').eq('student_id', userId),
    supabase.from('lesson_progress').select('lesson_slug').eq('student_id', userId),
    fetchHidden(supabase),
    fetchCourseOverrides(supabase),
  ]);
  const modules = new Set<string>();
  const lessons = new Set<string>();
  for (const g of grants ?? []) (g.kind === 'module' ? modules : lessons).add(g.ref as string);
  for (const d of done ?? []) lessons.add(d.lesson_slug as string);
  return { isTeacher: profile?.role === 'teacher', modules, lessons, trashed, courses };
}

export function canSee(meta: PageMeta, a: Access): boolean {
  if (a.trashed.has(meta.slug)) return false;
  const mod = withCourse(meta, a.courses).module; // з урахуванням перенесення в іншу категорію
  return a.isTeacher || a.lessons.has(meta.slug) || (!!mod && a.modules.has(mod));
}

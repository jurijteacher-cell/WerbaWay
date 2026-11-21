import type { SupabaseClient } from '@supabase/supabase-js';
import type { PageMeta } from './pages';

/**
 * Перенесення лекцій між категоріями (таблиця lecture_course, міграція 0018).
 * Рядок перекриває `module` / `moduleTitle` із шапки файлу лекції. Таблиці ще немає
 * (міграцію не застосовано) → перекриттів нема, сайт працює як раніше.
 */
export type CourseOverride = { module: string; moduleTitle: string | null };
export type CourseOverrides = Map<string, CourseOverride>;

export function isMissingCourseTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === 'PGRST205' || /lecture_course/.test(err.message ?? '');
}

export async function fetchCourseOverrides(supabase: SupabaseClient): Promise<CourseOverrides> {
  const { data, error } = await supabase.from('lecture_course').select('slug, module, module_title');
  const out: CourseOverrides = new Map();
  if (error) return out;
  for (const r of data ?? []) out.set(r.slug as string, { module: (r.module as string) ?? '', moduleTitle: (r.module_title as string | null) ?? null });
  return out;
}

/** Мета лекції з урахуванням перенесення ('' = без курсу) */
export function withCourse<T extends PageMeta>(meta: T, overrides: CourseOverrides): T {
  const o = overrides.get(meta.slug);
  if (!o) return meta;
  return { ...meta, module: o.module || undefined, moduleTitle: o.module ? o.moduleTitle ?? o.module : undefined };
}

export function applyCourseOverrides<T extends PageMeta>(pages: T[], overrides: CourseOverrides): T[] {
  return overrides.size ? pages.map((p) => withCourse(p, overrides)) : pages;
}

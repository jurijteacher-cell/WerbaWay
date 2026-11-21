import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadPage } from '@/lib/pages/pages';
import { isMissingCourseTable } from '@/lib/pages/course';

export const dynamic = 'force-dynamic';

const MODULE_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

/**
 * POST { slug, module, moduleTitle } — перенести лекцію в категорію (курс).
 *   module = '' — «Без курсу»; module = код наявної категорії + її moduleTitle;
 *   module = 'new' + moduleTitle — нова категорія (код видаємо тут).
 * POST { slug, reset: true } — повернути категорію з файлу лекції.
 * Лише викладач. Зміна лежить у lecture_course (міграція 0018) і перекриває шапку файлу.
 * Заодно змінює, кому відкрито лекцію через курс: доступ учня до категорії діє на її лекції.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'teacher') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string; module?: string; moduleTitle?: string; reset?: boolean };
  const slug = body.slug ?? '';
  if (!slug || !loadPage(slug)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const noTable = (err: { code?: string; message?: string }) =>
    isMissingCourseTable(err)
      ? NextResponse.json({ error: 'no_table', message: 'Потрібна міграція supabase/migrations/0018_lecture_course.sql.' }, { status: 503 })
      : NextResponse.json({ error: err.message }, { status: 500 });

  if (body.reset) {
    const { error } = await supabase.from('lecture_course').delete().eq('slug', slug);
    return error ? noTable(error) : NextResponse.json({ ok: true });
  }

  const title = (body.moduleTitle ?? '').trim().slice(0, 120);
  let module = body.module ?? '';
  if (module === 'new') {
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    module = `custom-${Math.random().toString(36).slice(2, 8)}`;
  }
  if (module && !MODULE_RE.test(module)) return NextResponse.json({ error: 'bad module' }, { status: 400 });
  if (module && !title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const { error } = await supabase.from('lecture_course').upsert({
    slug,
    module,
    module_title: module ? title : null,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });
  if (error) return noTable(error);
  return NextResponse.json({ ok: true, module });
}

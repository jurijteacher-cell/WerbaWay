import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadPage } from '@/lib/pages/pages';
import { shareToken } from '@/lib/share';

export const dynamic = 'force-dynamic';

async function teacher() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'teacher' ? { supabase, user } : null;
}

/** GET ?slug= — публічне посилання + учні з акаунтом і чи відкрита їм ця лекція */
export async function GET(req: Request) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const page = loadPage(slug);
  if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [{ data: profiles }, { data: grants }, { data: done }] = await Promise.all([
    t.supabase.from('profiles').select('id, full_name, role'),
    t.supabase.from('student_access').select('student_id, kind, ref'),
    t.supabase.from('lesson_progress').select('student_id').eq('lesson_slug', slug),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.student_id as string));
  const students = (profiles ?? [])
    .filter((p) => p.role !== 'teacher')
    .map((p) => {
      const mine = (grants ?? []).filter((g) => g.student_id === p.id);
      const lesson = mine.some((g) => g.kind === 'lesson' && g.ref === slug);
      const viaCourse = !!page.meta.module && mine.some((g) => g.kind === 'module' && g.ref === page.meta.module);
      return { id: p.id as string, name: (p.full_name as string) || 'Учень без імені', lesson, viaCourse, done: doneSet.has(p.id as string) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  const token = shareToken(slug);
  return NextResponse.json({ link: token ? `/s/${token}` : null, students });
}

/** POST { slug, studentId, on } — відкрити / закрити лекцію учню */
export async function POST(req: Request) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { slug, studentId, on } = (await req.json().catch(() => ({}))) as { slug?: string; studentId?: string; on?: boolean };
  if (!slug || !studentId || !loadPage(slug)) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const { error } = on
    ? await t.supabase.from('student_access').upsert({ student_id: studentId, kind: 'lesson', ref: slug, granted_by: t.user.id })
    : await t.supabase.from('student_access').delete().match({ student_id: studentId, kind: 'lesson', ref: slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadPage } from '@/lib/pages/pages';
import { randomBytes } from 'crypto';
import { t as tr } from '@/i18n/server';

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

  const [{ data: profiles }, { data: grants }, { data: done }, { data: share }] = await Promise.all([
    t.supabase.from('profiles').select('id, full_name, role'),
    t.supabase.from('student_access').select('student_id, kind, ref'),
    t.supabase.from('lesson_progress').select('student_id').eq('lesson_slug', slug),
    t.supabase
      .from('lecture_shares')
      .select('token, opens, created_at')
      .eq('lesson_slug', slug)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.student_id as string));
  const students = (profiles ?? [])
    .filter((p) => p.role !== 'teacher')
    .map((p) => {
      const mine = (grants ?? []).filter((g) => g.student_id === p.id);
      const lesson = mine.some((g) => g.kind === 'lesson' && g.ref === slug);
      const viaCourse = !!page.meta.module && mine.some((g) => g.kind === 'module' && g.ref === page.meta.module);
      return { id: p.id as string, name: (p.full_name as string) || tr("Учень без імені"), lesson, viaCourse, done: doneSet.has(p.id as string) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  return NextResponse.json({ link: share ? { url: `/s/${share.token}`, opens: share.opens } : null, students });
}

/**
 * POST { slug, studentId, on } — відкрити / закрити лекцію учню
 * POST { slug, link: 'create' | 'revoke' } — створити публічне посилання / вимкнути чинне
 */
export async function POST(req: Request) {
  const t = await teacher();
  if (!t) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { slug, studentId, on, link } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    studentId?: string;
    on?: boolean;
    link?: 'create' | 'revoke';
  };
  if (!slug || !loadPage(slug)) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  if (link === 'revoke') {
    const { error } = await t.supabase.from('lecture_shares').update({ revoked_at: new Date().toISOString() }).eq('lesson_slug', slug).is('revoked_at', null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: null });
  }
  if (link === 'create') {
    const token = randomBytes(12).toString('base64url'); // 96 біт: не вгадати й не перебрати
    const { error } = await t.supabase.from('lecture_shares').insert({ token, lesson_slug: slug, created_by: t.user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: { url: `/s/${token}`, opens: 0 } });
  }

  if (!studentId) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const { error } = on
    ? await t.supabase.from('student_access').upsert({ student_id: studentId, kind: 'lesson', ref: slug, granted_by: t.user.id })
    : await t.supabase.from('student_access').delete().match({ student_id: studentId, kind: 'lesson', ref: slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lessonTitle } from '@/lib/lesson-titles';
import { t } from '@/i18n/server';

export const dynamic = 'force-dynamic';

/** Останні здані домашки — для дзвіночка викладача */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'teacher') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // непрочитані повідомлення учнів у чаті — по одному рядку на учня
  const { data: chatRows } = await supabase
    .from('class_messages')
    .select('student_id, body, created_at')
    .eq('sender_role', 'student')
    .is('read_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(300);
  const byStudent = new Map<string, { n: number; body: string; at: string }>();
  for (const m of chatRows ?? []) {
    const cur = byStudent.get(m.student_id as string);
    if (cur) cur.n += 1;
    else byStudent.set(m.student_id as string, { n: 1, body: m.body as string, at: m.created_at as string });
  }
  const chatIds = [...byStudent.keys()];
  const { data: chatProfiles } = chatIds.length
    ? await supabase.from('profiles').select('id, full_name, first_name, last_name').in('id', chatIds)
    : { data: [] as { id: string; full_name: string | null; first_name: string | null; last_name: string | null }[] };
  const chatItems = chatIds.map((id) => {
    const p = (chatProfiles ?? []).find((x) => x.id === id);
    const name = p?.full_name?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || t("Учень");
    const c = byStudent.get(id)!;
    return {
      kind: 'chat' as const,
      id: `chat:${id}`,
      studentId: id,
      name,
      title: c.body.length > 90 ? `${c.body.slice(0, 90)}…` : c.body,
      at: c.at,
      n: c.n,
      href: `/teacher/students/${id}?dock=1`,
    };
  });
  if (new URL(req.url).searchParams.get('only') === 'chat') return NextResponse.json({ items: chatItems });

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('student_id, lesson_slug, homework_done_at, profiles(full_name, first_name, last_name)')
    .not('homework_done_at', 'is', null)
    .gte('homework_done_at', since)
    .order('homework_done_at', { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  type Row = {
    student_id: string;
    lesson_slug: string;
    homework_done_at: string;
    profiles: { full_name: string | null; first_name: string | null; last_name: string | null } | null;
  };
  const { data: bugs } = await supabase
    .from('bug_reports')
    .select('id, created_at, message, lesson_slug, page_url, reporter_id, resolved_at, profiles:reporter_id(full_name, first_name, last_name)')
    .is('resolved_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);

  const items = ((data ?? []) as unknown as Row[]).map((r) => {
    const p = r.profiles;
    const name =
      p?.full_name?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || t("Учень");
    return {
      kind: 'hw' as const,
      id: `${r.student_id}:${r.lesson_slug}:${r.homework_done_at}`,
      studentId: r.student_id,
      name,
      title: lessonTitle(r.lesson_slug) ?? r.lesson_slug,
      at: r.homework_done_at,
      href: `/teacher/results/${r.student_id}`,
    };
  });

  type Bug = {
    id: string;
    created_at: string;
    message: string;
    lesson_slug: string | null;
    reporter_id: string | null;
    profiles: { full_name: string | null; first_name: string | null; last_name: string | null } | null;
  };
  const bugItems = ((bugs ?? []) as unknown as Bug[]).map((b) => {
    const p = b.profiles;
    const name = p?.full_name?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || t("Учень");
    return {
      kind: 'bug' as const,
      id: b.id,
      studentId: b.reporter_id ?? '',
      name,
      title: b.message.length > 90 ? `${b.message.slice(0, 90)}…` : b.message,
      at: b.created_at,
      href: '/teacher/reports',
    };
  });

  const all = [...items, ...bugItems, ...chatItems].sort((a, b) => (a.at < b.at ? 1 : -1));
  return NextResponse.json({ items: all });
}

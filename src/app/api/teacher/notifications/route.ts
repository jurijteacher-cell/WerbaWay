import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { lessonTitle } from '@/lib/lesson-titles';

export const dynamic = 'force-dynamic';

/** Останні здані домашки — для дзвіночка викладача */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'teacher') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

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
      p?.full_name?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || 'Учень';
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
    const name = p?.full_name?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || 'Учень';
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

  const all = [...items, ...bugItems].sort((a, b) => (a.at < b.at ? 1 : -1));
  return NextResponse.json({ items: all });
}

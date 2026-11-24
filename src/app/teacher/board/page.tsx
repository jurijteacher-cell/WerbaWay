import { requireTeacher } from '@/app/teacher/results/requireTeacher';
import { TeacherBoard, type ViewerInfo } from '@/components/board/TeacherBoard';
import { sanitizeEls } from '@/lib/board/types';

export const dynamic = 'force-dynamic';

/** Дошка викладача: одна на всіх, зберігається, доки не натиснеш «Очистити». */
export default async function BoardPage({ searchParams }: { searchParams: { add?: string } }) {
  const supabase = await requireTeacher('/teacher/board');
  const [{ data: board }, { data: viewers }, { data: students }] = await Promise.all([
    supabase.from('teacher_board').select('els, vp, follow, rev').eq('id', 1).maybeSingle(),
    supabase.from('board_viewers').select('student_id, added_at, status'),
    supabase.from('profiles').select('id, full_name, role').neq('role', 'teacher').order('full_name'),
  ]);
  const names = new Map((students ?? []).map((s) => [s.id as string, (s.full_name as string) || '—']));
  const list: ViewerInfo[] = (students ?? []).map((s) => ({ id: s.id as string, name: (s.full_name as string) || '—' }));
  const added = (viewers ?? []).map((v) => ({ id: v.student_id as string, name: names.get(v.student_id as string) ?? '—', addedAt: v.added_at as string, status: ((v.status as 'invited' | 'accepted' | 'declined' | null) ?? 'accepted') as 'invited' | 'accepted' | 'declined' }));
  return (
    <TeacherBoard
      initial={{
        els: sanitizeEls(board?.els),
        vp: (board?.vp as { x: number; y: number; zoom: number } | null) ?? null,
        follow: board?.follow !== false,
        rev: Number(board?.rev ?? 0),
      }}
      students={list}
      viewers={added}
      addId={/^[0-9a-f-]{36}$/i.test(searchParams.add ?? '') ? searchParams.add : undefined}
    />
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTeacher } from '../../results/requireTeacher';
import { ClassTeacher } from '@/components/class/ClassTeacher';
import { EMPTY_ROOM, type RoomState } from '@/lib/class/protocol';
import { listPublishedLessonIds } from '@/content/queue-loader';
import { lessonTitle } from '@/lib/lesson-titles';
import { groupByCourse, listPages } from '@/lib/pages/pages';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeacherClassPage({ params }: { params: { studentId: string } }) {
  if (!UUID.test(params.studentId)) notFound();
  const supabase = await requireTeacher(`/teacher/class/${params.studentId}`);

  const [{ data: student }, { data: room }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('id', params.studentId).maybeSingle(),
    supabase.from('class_rooms').select('active, lesson_id, embed, blocks').eq('student_id', params.studentId).maybeSingle(),
  ]);
  if (!student) notFound();

  const lessons = listPublishedLessonIds()
    .map((id) => ({ id, title: `${lessonTitle(id)} · ${id}` }))
    .sort((a, b) => a.id.localeCompare(b.id));

  // лекції по курсах: де більше лекцій — вище
  const pages = groupByCourse(listPages()).flatMap((g) => g.pages.map((p) => ({ id: p.slug, title: p.title, group: g.title })));

  return (
    <main>
      <div className="mx-auto max-w-[1700px] px-4 pt-8">
        <Link href="/teacher/class" className="text-sm text-paper-muted hover:text-gold">
          ← Усі учні
        </Link>
      </div>
      <ClassTeacher
        studentId={student.id as string}
        studentName={(student.full_name as string | null) || 'Учень'}
        lessons={lessons}
        pages={pages}
        initialRoom={(room as RoomState | null) ?? EMPTY_ROOM}
      />
    </main>
  );
}

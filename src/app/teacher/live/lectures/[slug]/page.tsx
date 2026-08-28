import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLectureBySlug } from '@/content/lectures';
import { LectureLiveBoard } from './LectureLiveBoard';

export default async function LectureLivePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher') redirect('/');

  const lecture = getLectureBySlug(params.slug);
  if (!lecture) notFound();

  const lessonSlugs = Array.from(new Set(lecture.sections.map((s) => s.lessonSlug)));

  const [{ data: allStudents }, { data: assignments }, { data: submissions }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name'),
    supabase.from('assignments').select('student_id, profiles(full_name)').eq('lecture_slug', params.slug),
    supabase
      .from('submissions')
      .select('student_id, lesson_slug, exercise_id, answer, is_correct, auto_graded, edited_by_teacher, profiles(full_name)')
      .in('lesson_slug', lessonSlugs),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <Link href="/teacher" className="text-sm text-paper-muted transition-colors hover:text-gold">
        ← Кабінет викладача
      </Link>
      <h1 className="mb-1 mt-4 font-display text-3xl text-paper">Наживо: {lecture.title}</h1>
      <p className="mb-8 text-paper-muted">
        Бачиш, на якій вправі зараз кожен учень, і що він там пише — оновлюється в реальному часі.
      </p>

      <LectureLiveBoard
        lecture={lecture}
        allStudents={allStudents ?? []}
        initialAssignments={assignments ?? []}
        initialSubmissions={submissions ?? []}
      />
    </main>
  );
}

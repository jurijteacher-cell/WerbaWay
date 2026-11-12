import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lessons } from '@/content/lessons';
import { lectures } from '@/content/lectures';
import { TeacherSubmissions } from './TeacherSubmissions';

export default async function TeacherPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'teacher') {
    redirect('/');
  }

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(
      'id, lesson_slug, exercise_id, exercise_type, answer, is_correct, auto_graded, teacher_feedback, submitted_at, profiles(full_name)'
    )
    .order('submitted_at', { ascending: false });

  const lessonTitles = Object.fromEntries(lessons.map((l) => [l.slug, l.title]));

  const normalizedSubmissions = (submissions ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      id: s.id,
      lesson_slug: s.lesson_slug,
      exercise_id: s.exercise_id,
      answer: s.answer as { text?: string },
      is_correct: s.is_correct,
      auto_graded: s.auto_graded,
      profiles: profile ? { full_name: profile.full_name as string | null } : null,
    };
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 font-display text-3xl text-paper">Кабінет викладача</h1>

      <section className="mb-12 flex flex-wrap gap-3">
        <Link href="/teacher/class" className="ww-btn ww-btn-primary ww-btn-lg">
          Учні й клас наживо
        </Link>
        <Link href="/learn" className="ww-btn ww-btn-secondary ww-btn-lg">
          Лекції курсу
        </Link>
        <Link href="/teacher/results" className="ww-btn ww-btn-secondary ww-btn-lg">
          Результати вправ
        </Link>
        <Link href="/teacher/analytics" className="ww-btn ww-btn-secondary ww-btn-lg">
          Аналітика
        </Link>
      </section>

      {error && <p className="text-incorrect">Помилка завантаження: {error.message}</p>}

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl text-paper">Інтерактивні лекції наживо</h2>
        <div className="flex flex-wrap gap-2">
          {lectures.map((lecture) => (
            <Link
              key={lecture.slug}
              href={`/teacher/live/lectures/${lecture.slug}`}
              className="ww-btn ww-btn-ghost"
            >
              {lecture.title} →
            </Link>
          ))}
          {lectures.length === 0 && <p className="text-sm text-paper-muted">Ще немає жодної лекції.</p>}
        </div>
      </section>

      <TeacherSubmissions submissions={normalizedSubmissions} lessonTitles={lessonTitles} />
    </main>
  );
}

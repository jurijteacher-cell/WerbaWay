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

      {error && <p className="text-incorrect">Помилка завантаження: {error.message}</p>}

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl text-paper">Лекції наживо</h2>
        <div className="flex flex-wrap gap-2">
          {lectures.map((lecture) => (
            <Link
              key={lecture.slug}
              href={`/teacher/live/lectures/${lecture.slug}`}
              className="rounded-lg border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10"
            >
              {lecture.title} →
            </Link>
          ))}
          {lectures.length === 0 && <p className="text-sm text-paper-muted">Ще немає жодної лекції.</p>}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl text-paper">Наживо</h2>
        <div className="flex flex-col gap-3">
          {Array.from(new Set(lessons.filter((l) => !l.hideFromBrowse).map((l) => l.category || 'Інше'))).map(
            (category) => (
              <div key={category}>
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-stone-600">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {lessons
                    .filter((l) => !l.hideFromBrowse && (l.category || 'Інше') === category)
                    .map((lesson) => (
                      <Link
                        key={lesson.slug}
                        href={`/teacher/live/${lesson.slug}`}
                        className="rounded-lg border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10"
                      >
                        {lesson.title} →
                      </Link>
                    ))}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <TeacherSubmissions submissions={normalizedSubmissions} lessonTitles={lessonTitles} />
    </main>
  );
}

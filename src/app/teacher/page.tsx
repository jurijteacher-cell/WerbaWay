import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lessons } from '@/content/lessons';
import { lectures } from '@/content/lectures';
import { GradeForm } from './GradeForm';

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

  const pendingReview = (submissions ?? []).filter((s) => !s.auto_graded && s.is_correct === null);
  const rest = (submissions ?? []).filter((s) => s.auto_graded || s.is_correct !== null);

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

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl text-gold">Очікують перевірки ({pendingReview.length})</h2>
        <div className="flex flex-col gap-4">
          {pendingReview.length === 0 && <p className="text-paper-muted">Порожньо — усе перевірено.</p>}
          {pendingReview.map((s) => (
            <div key={s.id} className="rounded-xl border border-gold/30 bg-ink-raised p-5">
              <p className="text-sm text-paper-muted">
                {(s.profiles as any)?.full_name ?? 'Учень'} · {s.lesson_slug} · {s.exercise_id}
              </p>
              <p className="mt-2 text-paper">{(s.answer as any)?.text}</p>
              <div className="mt-4">
                <GradeForm submissionId={s.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl text-paper">Уже перевірено</h2>
        <div className="flex flex-col gap-2">
          {rest.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-ink-line px-4 py-3 text-sm">
              <span className="text-paper-muted">
                {(s.profiles as any)?.full_name ?? 'Учень'} · {s.lesson_slug} · {s.exercise_id}
              </span>
              <span className={s.is_correct ? 'text-correct' : 'text-incorrect'}>
                {s.is_correct ? '✓ вірно' : '✕ невірно'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

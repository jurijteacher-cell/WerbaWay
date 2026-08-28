import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { lectures } from '@/content/lectures';
import { ProgressBadge } from '@/components/ProgressBadge';
import { getSubmissionRowsForUser } from '@/lib/submissions';

export default async function LecturesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: assignments } = await supabase
    .from('assignments')
    .select('lecture_slug')
    .eq('student_id', user.id);

  const assignedSlugs = new Set((assignments ?? []).map((a) => a.lecture_slug));
  const assigned = lectures.filter((l) => assignedSlugs.has(l.slug));
  const rest = lectures.filter((l) => !assignedSlugs.has(l.slug));
  const submissionRows = await getSubmissionRowsForUser(user.id);

  const lectureProgress = (lecture: (typeof lectures)[number]) => {
    const exerciseSlugs = lecture.sections.flatMap((s) =>
      s.exercises.map((e) => ({ lessonSlug: s.lessonSlug, exerciseId: e.id }))
    );
    const done = exerciseSlugs.filter(({ lessonSlug, exerciseId }) =>
      submissionRows.some((r) => r.lesson_slug === lessonSlug && r.exercise_id === exerciseId)
    ).length;
    return { done, total: exerciseSlugs.length };
  };

  const Card = (lecture: (typeof lectures)[number]) => {
    const progress = lectureProgress(lecture);
    return (
    <Link
      key={lecture.slug}
      href={`/lectures/${lecture.slug}`}
      className="group rounded-xl border border-ink-line bg-ink-raised px-6 py-5 transition-colors hover:border-gold"
    >
      <h3 className="font-display text-xl text-paper group-hover:text-gold-bright">{lecture.title}</h3>
      {lecture.subtitle && <p className="mt-1 text-paper-muted">{lecture.subtitle}</p>}
      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-gold-dim">
        {lecture.sections.length} {lecture.sections.length === 1 ? 'секція' : 'секцій'} ·{' '}
        {progress.total} вправ
      </p>
      <ProgressBadge done={progress.done} total={progress.total} />
    </Link>
    );
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12">
        <p className="text-sm uppercase tracking-widest text-gold-dim">Werba Way</p>
        <h1 className="font-display text-3xl text-paper">Лекції</h1>
      </div>

      {assigned.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-gold">Призначено тобі</h2>
          <div className="flex flex-col gap-3">{assigned.map(Card)}</div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          {assigned.length > 0 && (
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-paper-muted">Інші лекції</h2>
          )}
          <div className="flex flex-col gap-3">{rest.map(Card)}</div>
        </section>
      )}

      {lectures.length === 0 && <p className="text-paper-muted">Поки що немає жодної лекції.</p>}
    </main>
  );
}

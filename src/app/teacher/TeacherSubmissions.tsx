'use client';

import { useMemo, useState } from 'react';
import { GradeForm } from './GradeForm';

type Submission = {
  id: string;
  lesson_slug: string;
  exercise_id: string;
  answer: { text?: string };
  is_correct: boolean | null;
  auto_graded: boolean;
  profiles: { full_name: string | null } | null;
};

type Props = {
  submissions: Submission[];
  lessonTitles: Record<string, string>;
};

export function TeacherSubmissions({ submissions, lessonTitles }: Props) {
  const [lessonFilter, setLessonFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');

  const students = useMemo(() => {
    const names = new Map<string, string>();
    for (const s of submissions) {
      const name = s.profiles?.full_name ?? 'Учень';
      names.set(name, name);
    }
    return Array.from(names.values()).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [submissions]);

  const lessons = useMemo(() => {
    const slugs = Array.from(new Set(submissions.map((s) => s.lesson_slug))).sort();
    return slugs.map((slug) => ({ slug, title: lessonTitles[slug] ?? slug }));
  }, [submissions, lessonTitles]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const name = s.profiles?.full_name ?? 'Учень';
      if (lessonFilter !== 'all' && s.lesson_slug !== lessonFilter) return false;
      if (studentFilter !== 'all' && name !== studentFilter) return false;
      return true;
    });
  }, [submissions, lessonFilter, studentFilter]);

  const pendingReview = filtered.filter((s) => !s.auto_graded && s.is_correct === null);
  const rest = filtered.filter((s) => s.auto_graded || s.is_correct !== null);

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm text-paper-muted">
          Урок
          <select
            value={lessonFilter}
            onChange={(e) => setLessonFilter(e.target.value)}
            className="min-w-[12rem] rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
          >
            <option value="all">Усі уроки</option>
            {lessons.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-paper-muted">
          Учень
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="min-w-[12rem] rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
          >
            <option value="all">Усі учні</option>
            {students.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-xl text-gold">Очікують перевірки ({pendingReview.length})</h2>
        <div className="flex flex-col gap-4">
          {pendingReview.length === 0 && <p className="text-paper-muted">Порожньо — усе перевірено.</p>}
          {pendingReview.map((s) => (
            <div key={s.id} className="rounded-xl border border-gold/30 bg-ink-raised p-5">
              <p className="text-sm text-paper-muted">
                {s.profiles?.full_name ?? 'Учень'} · {lessonTitles[s.lesson_slug] ?? s.lesson_slug} · {s.exercise_id}
              </p>
              <p className="mt-2 text-paper">{s.answer?.text}</p>
              <div className="mt-4">
                <GradeForm submissionId={s.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl text-paper">Уже перевірено ({rest.length})</h2>
        <div className="flex flex-col gap-2">
          {rest.length === 0 && <p className="text-paper-muted">Немає записів за цими фільтрами.</p>}
          {rest.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-ink-line px-4 py-3 text-sm"
            >
              <span className="text-paper-muted">
                {s.profiles?.full_name ?? 'Учень'} · {lessonTitles[s.lesson_slug] ?? s.lesson_slug} · {s.exercise_id}
              </span>
              <span className={s.is_correct ? 'text-correct' : 'text-incorrect'}>
                {s.is_correct ? '✓ вірно' : '✕ невірно'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

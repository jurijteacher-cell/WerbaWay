import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLessonBySlug } from '@/content/lessons';
import { toPublicLesson } from '@/content/types';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { getSubmissionsForLessons, submissionKey } from '@/lib/submissions';
import { hasQueueLesson, loadQueueLesson } from '@/lib/queue-lesson';
import { NotebookLesson } from '@/components/exercises/NotebookLesson';
import { stripTeacherTexts } from '@/lib/teacher-reads';
import '@/components/exercises/notebook.css';

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { teacher?: string };
}) {
  // Content-queue notebook lessons are public (e2e + LMS embeds)
  if (hasQueueLesson(params.slug)) {
    const bundle = loadQueueLesson(params.slug);
    if (!bundle) notFound();
    const title = bundle.frontmatter.title ?? params.slug;
    const teacherMode = searchParams?.teacher === '1';
    // Encode markers so raw [IMAGE]/[AUDIO]/… never appear in client HTML/props
    const safeBody = bundle.body.replace(
      /\[(IMAGE|AUDIO|SLIDES|EXERCISE):([^\]]*)\]/g,
      (_m, kind: string, attrs: string) =>
        `%%MK:${kind}:${Buffer.from(attrs, 'utf8').toString('base64url')}%%`
    );
    return (
      <main style={{ background: '#E7E2D7', minHeight: '100vh' }}>
        <NotebookLesson
          lessonId={bundle.lessonId}
          title={title}
          levelHint={bundle.frontmatter.level ? `poziom ${bundle.frontmatter.level}` : undefined}
          body={safeBody}
          images={bundle.images}
          vocab={bundle.vocab as never}
          pictures={bundle.pictures as never}
          commTasks={bundle.commTasks as never}
          grammar={bundle.grammar as never}
          exam={stripTeacherTexts(bundle.exam, teacherMode) as never}
          hw={bundle.hw as never}
          teacherMode={teacherMode}
        />
      </main>
    );
  }

  const lesson = getLessonBySlug(params.slug);
  if (!lesson) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const studentName = profile?.full_name || user.email || 'Учень';

  const submissions = await getSubmissionsForLessons(user.id, [lesson.slug]);
  const publicLesson = toPublicLesson(lesson);

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/" className="text-sm text-paper-muted transition-colors hover:text-gold">
        ← Усі уроки
      </Link>

      <h1 className="mb-2 mt-4 font-display text-4xl text-paper">{publicLesson.title}</h1>
      {publicLesson.subtitle && <p className="mb-8 text-lg text-paper-muted">{publicLesson.subtitle}</p>}

      <div className="mb-12 flex flex-col gap-4">
        {publicLesson.content.map((paragraph, i) => (
          <p key={i} className="leading-relaxed text-paper/90">
            {paragraph}
          </p>
        ))}
      </div>

      <h2 className="mb-4 font-display text-2xl text-paper">Завдання</h2>
      <div className="flex flex-col gap-4">
        {publicLesson.exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            lessonSlug={publicLesson.slug}
            index={i}
            studentId={user.id}
            studentName={studentName}
            initialSubmission={submissions.get(submissionKey(publicLesson.slug, exercise.id)) ?? null}
          />
        ))}
      </div>
    </main>
  );
}

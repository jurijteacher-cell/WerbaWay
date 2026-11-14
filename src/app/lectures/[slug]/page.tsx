import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLectureBySlug } from '@/content/lectures';
import { toPublicLecture } from '@/content/types';
import { LecturePlayer } from './LecturePlayer';
import { getSubmissionsForLessons } from '@/lib/submissions';
import { t } from '@/i18n/server';

export default async function LecturePage({ params }: { params: { slug: string } }) {
  const lecture = getLectureBySlug(params.slug);
  if (!lecture) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const studentName = profile?.full_name || user.email || t("Учень");

  const lessonSlugs = Array.from(new Set(lecture.sections.map((s) => s.lessonSlug)));
  const submissions = await getSubmissionsForLessons(user.id, lessonSlugs);
  const submissionsRecord = Object.fromEntries(submissions);

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/lectures" className="text-sm text-paper-muted transition-colors hover:text-gold">
        ← Усі лекції
      </Link>
      <h1 className="mb-1 mt-4 font-display text-4xl text-paper">{lecture.title}</h1>
      {lecture.subtitle && <p className="mb-4 text-lg text-paper-muted">{lecture.subtitle}</p>}

      {lecture.slug === 'kino' && (
        <Link
          href="/lectures/kino/movies"
          className="ww-btn ww-btn-ghost mb-8 inline-flex items-center gap-2"
        >
          🎬 Практика: обговорення фільмів →
        </Link>
      )}

      <div className={lecture.slug === 'kino' ? '' : 'mt-8'}>
        <LecturePlayer
          lecture={toPublicLecture(lecture)}
          studentId={user.id}
          studentName={studentName}
          initialSubmissions={submissionsRecord}
        />
      </div>
    </main>
  );
}

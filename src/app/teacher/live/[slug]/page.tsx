import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLessonBySlug } from '@/content/lessons';
import { LiveBoard } from './LiveBoard';

export default async function LiveLessonPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher') redirect('/');

  // Повний урок, ІЗ правильними відповідями — цей маршрут доступний тільки
  // вчителю (перевірено вище), тому дані сюди можна передавати.
  const lesson = getLessonBySlug(params.slug);
  if (!lesson) notFound();

  const { data: existing } = await supabase
    .from('submissions')
    .select('student_id, exercise_id, answer, is_correct, auto_graded, edited_by_teacher, profiles(full_name)')
    .eq('lesson_slug', params.slug);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <Link href="/teacher" className="text-sm text-paper-muted transition-colors hover:text-gold">
        ← Кабінет викладача
      </Link>
      <h1 className="mb-1 mt-4 font-display text-3xl text-paper">Наживо: {lesson.title}</h1>
      <p className="mb-8 text-paper-muted">
        Оновлюється в реальному часі, поки учні друкують/обирають відповіді.
      </p>

      <LiveBoard lesson={lesson} initialSubmissions={existing ?? []} />
    </main>
  );
}

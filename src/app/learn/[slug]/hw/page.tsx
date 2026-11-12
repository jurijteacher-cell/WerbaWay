import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadPage } from '@/lib/pages/pages';
import { canSee, getAccess } from '@/lib/pages/access';
import { LessonView } from '@/components/lesson/LessonView';

export const dynamic = 'force-dynamic';

export default async function HomeworkPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${params.slug}/hw`);

  const page = loadPage(params.slug);
  if (!page || !page.hasHomework) notFound();

  const { data: row } = await supabase
    .from('lesson_progress')
    .select('homework_assigned_at, homework_done_at')
    .eq('student_id', user.id)
    .eq('lesson_slug', params.slug)
    .maybeSingle();

  const access = await getAccess(supabase, user.id);
  if (!canSee(page.meta, access) && !row) notFound();
  // Викладач бачить сторінку без кнопки «виконано»
  const hw = access.isTeacher ? null : { assigned: !!row?.homework_assigned_at, done: !!row?.homework_done_at };
  return <LessonView page={page} mode="homework" hw={hw} />;
}

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadPage, loadTeacherPage } from '@/lib/pages/pages';
import { canSee, getAccess } from '@/lib/pages/access';
import { withCourse } from '@/lib/pages/course';
import { LessonView } from '@/components/lesson/LessonView';
import { getLocale } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = loadPage(params.slug, getLocale());
  return { title: page ? `${page.meta.title} — Werba Way` : 'Werba Way' };
}

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { p?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${params.slug}`);

  const locale = getLocale();
  const loaded = loadPage(params.slug, locale);
  if (!loaded) notFound();
  const access = await getAccess(supabase, user.id);
  const page = { ...loaded, meta: withCourse(loaded.meta, access.courses) };
  // лекцію з кошика викладач може переглянути (відкриває її з /teacher/trash)
  const inTrash = access.isTeacher && access.trashed.has(page.meta.slug);
  if (!canSee(page.meta, access) && !inTrash) notFound();
  const p = Number(searchParams?.p);
  return (
    <LessonView
      page={page}
      mode="lecture"
      pageIndex={Number.isFinite(p) && p > 0 ? p - 1 : 0}
      teacherNotes={access.isTeacher && !!loadTeacherPage(params.slug)}
      canShare={access.isTeacher && !inTrash}
      inTrash={inTrash}
    />
  );
}

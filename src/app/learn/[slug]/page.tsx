import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadPage, loadTeacherPage } from '@/lib/pages/pages';
import { canSee, getAccess } from '@/lib/pages/access';
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
  const page = loadPage(params.slug, locale);
  if (!page) notFound();
  const access = await getAccess(supabase, user.id);
  if (!canSee(page.meta, access)) notFound();
  const p = Number(searchParams?.p);
  return (
    <LessonView
      page={page}
      mode="lecture"
      pageIndex={Number.isFinite(p) && p > 0 ? p - 1 : 0}
      teacherNotes={access.isTeacher && !!loadTeacherPage(params.slug)}
      canShare={access.isTeacher}
    />
  );
}

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loadPage } from '@/lib/pages/pages';
import { getLocale } from '@/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { claimSharedLesson, sharedSlug } from '@/lib/share';
import { LessonView } from '@/components/lesson/LessonView';
import { PublicBar } from '../PublicBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Домашка за посиланням. Залогінений читає її як свою — на /learn/<slug>/hw (там її видно викладачеві). */
export default async function SharedHomework({ params }: { params: { token: string } }) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) {
    const known = await sharedSlug(params.token);
    if (!known) notFound();
    const claimed = await claimSharedLesson(params.token, loadPage(known)?.meta.module);
    if (claimed) redirect(`/learn/${claimed}/hw`);
    // доступ видати не вдалося — домашку все одно показуємо, як гостю
  }

  const slug = await sharedSlug(params.token);
  const page = slug ? loadPage(slug, getLocale()) : null;
  if (!page || !page.hasHomework) notFound();
  return (
    <>
      <PublicBar />
      <LessonView page={page} mode="homework" hw={null} publicBase={`/s/${params.token}`} />
    </>
  );
}

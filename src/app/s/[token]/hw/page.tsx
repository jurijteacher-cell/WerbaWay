import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPage } from '@/lib/pages/pages';
import { getLocale } from '@/i18n/server';
import { sharedSlug } from '@/lib/share';
import { LessonView } from '@/components/lesson/LessonView';
import { PublicBar } from '../PublicBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SharedHomework({ params }: { params: { token: string } }) {
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

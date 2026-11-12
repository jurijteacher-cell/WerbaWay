import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPage } from '@/lib/pages/pages';
import { verifyShare } from '@/lib/share';
import { LessonView } from '@/components/lesson/LessonView';
import { PublicBar } from '../PublicBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SharedHomework({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const slug = verifyShare(token);
  const page = slug ? loadPage(slug) : null;
  if (!page || !page.hasHomework) notFound();
  return (
    <>
      <PublicBar />
      <LessonView page={page} mode="homework" hw={null} publicBase={`/s/${token}`} />
    </>
  );
}

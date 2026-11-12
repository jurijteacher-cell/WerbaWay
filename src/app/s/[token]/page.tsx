import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPage } from '@/lib/pages/pages';
import { sharedSlug } from '@/lib/share';
import { LessonView } from '@/components/lesson/LessonView';
import { PublicBar } from './PublicBar';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const slug = await sharedSlug(params.token);
  const page = slug ? loadPage(slug) : null;
  return { title: page ? `${page.meta.title} — Werba Way` : 'Werba Way', robots: { index: false, follow: false } };
}

/** Лекція за публічним посиланням: без входу, без меню сайту */
export default async function SharedLecture({ params, searchParams }: { params: { token: string }; searchParams?: { p?: string } }) {
  const slug = await sharedSlug(params.token, true);
  const page = slug ? loadPage(slug) : null;
  if (!page) notFound();
  const p = Number(searchParams?.p);
  return (
    <>
      <PublicBar />
      <LessonView page={page} mode="lecture" pageIndex={Number.isFinite(p) && p > 0 ? p - 1 : 0} publicBase={`/s/${params.token}`} />
    </>
  );
}

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loadPage } from '@/lib/pages/pages';
import { getLocale } from '@/i18n/server';
import { createClient } from '@/lib/supabase/server';
import { claimSharedLesson, sharedSlug } from '@/lib/share';
import { LessonView } from '@/components/lesson/LessonView';
import { PublicBar } from './PublicBar';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const slug = await sharedSlug(params.token);
  const page = slug ? loadPage(slug, getLocale()) : null;
  return { title: page ? `${page.meta.title} — Werba Way` : 'Werba Way', robots: { index: false, follow: false } };
}

/**
 * Лекція за публічним посиланням.
 * Гість читає її тут: без входу, без меню сайту, відповіді лишаються в браузері.
 * Той, хто вже увійшов, отримує лекцію собі в курс і далі читає її як свою — на /learn/<slug>,
 * де пишеться прогрес, задається домашка й результати вправ ідуть на його акаунт.
 */
export default async function SharedLecture({ params, searchParams }: { params: { token: string }; searchParams?: { p?: string } }) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) {
    const known = await sharedSlug(params.token); // без лічильника: його збільшить claim
    if (!known) notFound();
    const claimed = await claimSharedLesson(params.token, loadPage(known)?.meta.module);
    if (claimed) {
      const n = Number(searchParams?.p);
      redirect(`/learn/${claimed}${Number.isFinite(n) && n > 0 ? `?p=${n}` : ''}`);
    }
    // доступ видати не вдалося — лекцію все одно показуємо, як гостю
  }

  const slug = await sharedSlug(params.token, true);
  const page = slug ? loadPage(slug, getLocale()) : null;
  if (!page) notFound();
  const p = Number(searchParams?.p);
  return (
    <>
      <PublicBar />
      <LessonView page={page} mode="lecture" pageIndex={Number.isFinite(p) && p > 0 ? p - 1 : 0} publicBase={`/s/${params.token}`} />
    </>
  );
}

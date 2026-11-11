import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadPage } from '@/lib/pages/pages';
import { LessonView } from '@/components/lesson/LessonView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = loadPage(params.slug);
  return { title: page ? `${page.meta.title} — Werba Way` : 'Werba Way' };
}

export default async function LearnPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${params.slug}`);

  const page = loadPage(params.slug);
  if (!page) notFound();
  return <LessonView page={page} />;
}

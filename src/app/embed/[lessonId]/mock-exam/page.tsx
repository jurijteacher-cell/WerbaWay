import { notFound } from 'next/navigation';
import { loadMockExam } from '@/lib/mock-exam/core';
import { MockExam } from '@/components/exercises/MockExam';
import { getLocale } from '@/i18n/server';

type Props = { params: { lessonId: string }; searchParams: { review?: string | string[]; part?: string | string[] } };

/** `?review={mock_results.id}` — розбір спроби: завдання відкриваються вже розв'язаними (учень або викладач). */
export default function EmbedMockExamPage({ params, searchParams }: Props) {
  if (!loadMockExam(params.lessonId, getLocale())) notFound();
  const review = typeof searchParams.review === 'string' && /^[0-9a-f-]{36}$/i.test(searchParams.review) ? searchParams.review : undefined;
  const part = typeof searchParams.part === 'string' && /^[a-z0-9_-]{1,24}$/i.test(searchParams.part) ? searchParams.part : undefined;
  return <MockExam lessonId={params.lessonId} reviewId={review} part={part} />;
}

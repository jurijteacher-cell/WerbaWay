import { notFound } from 'next/navigation';
import { loadMockExam } from '@/lib/mock-exam/core';
import { MockExam } from '@/components/exercises/MockExam';

type Props = { params: { lessonId: string } };

export default function EmbedMockExamPage({ params }: Props) {
  if (!loadMockExam(params.lessonId)) notFound();
  return <MockExam lessonId={params.lessonId} />;
}

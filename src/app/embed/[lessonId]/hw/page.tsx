import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { HomeworkEmbed } from '@/components/exercises/HomeworkEmbed';

type Props = { params: { lessonId: string } };

export default function EmbedHwPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  return <HomeworkEmbed data={bundle.hw} />;
}

import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { VocabCards } from '@/components/exercises/VocabCards';

type Props = { params: { lessonId: string } };

export default function EmbedVocabPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  const { vocab } = bundle;
  return (
    <VocabCards
      title={vocab.title}
      instructions={vocab.instructions}
      items={vocab.items}
      groups={vocab.groups}
    />
  );
}

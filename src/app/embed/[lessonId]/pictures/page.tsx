import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { PictureSet } from '@/components/exercises/PictureSet';

type Props = { params: { lessonId: string } };

export default function EmbedPicturesPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  const { pictures } = bundle;
  return (
    <PictureSet
      title={pictures.title}
      instructions={pictures.instructions}
      phrase_bank={pictures.phrase_bank}
      items={pictures.items}
    />
  );
}

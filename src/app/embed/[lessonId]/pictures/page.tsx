import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { getLocale } from '@/i18n/server';
import { PictureSet } from '@/components/exercises/PictureSet';

type Props = { params: { lessonId: string } };

export default function EmbedPicturesPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId, getLocale());
  if (!bundle?.pictures) notFound();
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

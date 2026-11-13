import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { getLocale } from '@/i18n/server';
import { GrammarPyramid } from '@/components/exercises/GrammarPyramid';
import { parseBlockIds } from '@/lib/block-ids';

type Props = {
  params: { lessonId: string };
  searchParams?: { blocks?: string };
};

export default function EmbedGrammarPage({ params, searchParams }: Props) {
  const bundle = getQueueBundle(params.lessonId, getLocale());
  if (!bundle?.grammar) notFound();
  const blockIds = parseBlockIds(searchParams?.blocks);
  return <GrammarPyramid data={bundle.grammar} blockIds={blockIds} />;
}

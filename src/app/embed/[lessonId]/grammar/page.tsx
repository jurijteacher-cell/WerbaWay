import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { GrammarPyramid } from '@/components/exercises/GrammarPyramid';
import { parseBlockIds } from '@/lib/block-ids';

type Props = {
  params: { lessonId: string };
  searchParams?: { blocks?: string };
};

export default function EmbedGrammarPage({ params, searchParams }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  const blockIds = parseBlockIds(searchParams?.blocks);
  return <GrammarPyramid data={bundle.grammar} blockIds={blockIds} />;
}

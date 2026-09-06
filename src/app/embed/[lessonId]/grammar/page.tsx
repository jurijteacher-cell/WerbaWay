import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { GrammarPyramid } from '@/components/exercises/GrammarPyramid';

type Props = { params: { lessonId: string } };

export default function EmbedGrammarPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  return <GrammarPyramid data={bundle.grammar} />;
}

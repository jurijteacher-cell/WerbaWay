import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { GrammarBoard } from '@/components/exercises/GrammarBoard';

type Props = { params: { lessonId: string } };

/** Interactive grammar-board: cards with mini-tasks. */
export default function EmbedGrammarBoardPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle?.grammarBoard) notFound();
  return <GrammarBoard data={bundle.grammarBoard} />;
}

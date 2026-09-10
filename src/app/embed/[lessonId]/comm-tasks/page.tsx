import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { FlipTask } from '@/components/exercises/FlipTask';

type Props = { params: { lessonId: string } };

export default function EmbedCommTasksPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  const { commTasks } = bundle;
  return (
    <FlipTask
      title={commTasks.title}
      instructions={commTasks.instructions}
      items={commTasks.items}
    />
  );
}

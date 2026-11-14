import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { getLocale } from '@/i18n/server';
import { FlipTask } from '@/components/exercises/FlipTask';

type Props = { params: { lessonId: string } };

export default function EmbedCommTasksPage({ params }: Props) {
  const bundle = getQueueBundle(params.lessonId, getLocale());
  if (!bundle) notFound();
  const { commTasks } = bundle;
  return (
    <FlipTask
      title={commTasks.title}
      instructions={commTasks.instructions}
      instructionsUk={commTasks.instructions_uk}
      items={commTasks.items}
    />
  );
}

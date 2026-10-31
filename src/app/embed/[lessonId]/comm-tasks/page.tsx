import { notFound } from 'next/navigation';
import { getQueueBundle } from '@/content/queue-loader';
import { FlipTask } from '@/components/exercises/FlipTask';

type Props = { params: { lessonId: string }; searchParams?: { teacher?: string } };

export default function EmbedCommTasksPage({ params, searchParams }: Props) {
  const bundle = getQueueBundle(params.lessonId);
  if (!bundle) notFound();
  const { commTasks } = bundle;
  return (
    <FlipTask
      title={commTasks.title}
      instructions={commTasks.instructions}
      instructionsUk={commTasks.instructions_uk}
      items={commTasks.items}
      teacherMode={searchParams?.teacher === '1'}
    />
  );
}

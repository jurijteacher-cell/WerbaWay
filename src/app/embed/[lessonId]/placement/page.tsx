import { notFound } from 'next/navigation';
import { existsSync } from 'fs';
import path from 'path';
import { PlacementTest } from '@/components/exercises/PlacementTest';

type Props = { params: { lessonId: string } };

export default function EmbedPlacementPage({ params }: Props) {
  const file = path.join(
    process.cwd(),
    'src/content/queue-published',
    `${params.lessonId}-test.json`
  );
  if (!existsSync(file)) notFound();
  return <PlacementTest lessonId={params.lessonId} />;
}

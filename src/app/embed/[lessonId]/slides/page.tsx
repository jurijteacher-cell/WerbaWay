import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { GrammarSlides } from '@/components/exercises/GrammarSlides';

type Props = {
  params: { lessonId: string };
  searchParams?: { part?: string };
};

export default function EmbedSlidesPage({ params, searchParams }: Props) {
  const file = path.join(
    process.cwd(),
    'src/content/queue-published',
    `${params.lessonId}-slides.json`
  );
  if (!existsSync(file)) notFound();
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const partRaw = searchParams?.part;
  const part = partRaw != null && partRaw !== '' ? Number(partRaw) : undefined;
  return (
    <GrammarSlides
      title={raw.title ?? 'Slajdy'}
      slides={raw.slides ?? []}
      part={Number.isFinite(part) ? part : undefined}
    />
  );
}

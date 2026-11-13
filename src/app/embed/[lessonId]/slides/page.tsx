import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { GrammarSlides } from '@/components/exercises/GrammarSlides';
import { localizeExercise } from '@/lib/content-locale';
import { getLocale } from '@/i18n/server';

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
  const raw = localizeExercise(`${params.lessonId}-slides.json`, JSON.parse(readFileSync(file, 'utf8')), getLocale());
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

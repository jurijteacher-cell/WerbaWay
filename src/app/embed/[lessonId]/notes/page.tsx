import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { GrammarNotes, type NotesSection } from '@/components/exercises/GrammarNotes';
import { localizeExercise } from '@/lib/content-locale';
import { getLocale } from '@/i18n/server';

type Props = {
  params: { lessonId: string };
  searchParams?: { sec?: string };
};

export default function EmbedNotesPage({ params, searchParams }: Props) {
  const file = path.join(
    process.cwd(),
    'src/content/queue-published',
    `${path.basename(params.lessonId)}-notes.json`
  );
  if (!existsSync(file)) notFound();
  const raw = localizeExercise(
    `${path.basename(params.lessonId)}-notes.json`,
    JSON.parse(readFileSync(file, 'utf8')) as { sections?: NotesSection[] },
    getLocale()
  );
  const wanted = searchParams?.sec?.split(',').map((s) => s.trim()).filter(Boolean);
  const sections = (raw.sections ?? []).filter((s) => !wanted?.length || wanted.includes(s.id));
  if (!sections.length) notFound();
  return <GrammarNotes sections={sections} />;
}

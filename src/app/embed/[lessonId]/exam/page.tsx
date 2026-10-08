import { notFound } from 'next/navigation';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { ExamTasks, type ExamExercise, type ExamBlock } from '@/components/exercises/ExamTasks';
import { parseBlockIds } from '@/lib/block-ids';

type Props = {
  params: { lessonId: string };
  searchParams?: { blocks?: string };
};

type DialogueLine = { speaker?: string; line?: string };

function loadTranscript(lessonId: string, source?: string): ExamBlock['transcript'] {
  if (!source || !source.includes('#')) return undefined;
  const [fileHint, frag] = source.split('#');
  const file = fileHint.endsWith('.json') ? fileHint : `${lessonId}-comm-tasks.json`;
  const full = path.join(process.cwd(), 'src/content/queue-published', path.basename(file));
  if (!existsSync(full)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(full, 'utf8'));
    const [itemId, field] = frag.split('.');
    const item = (raw.items ?? []).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any) => String(it.id) === itemId
    );
    const dialogue = (item?.[field || 'model_dialogue'] ?? []) as DialogueLine[];
    return dialogue
      .filter((d) => d.line)
      .map((d) => ({ speaker: d.speaker || '—', line: d.line || '' }));
  } catch {
    return undefined;
  }
}

export default function EmbedExamPage({ params, searchParams }: Props) {
  const file = path.join(
    process.cwd(),
    'src/content/queue-published',
    `${params.lessonId}-exam.json`
  );
  if (!existsSync(file)) notFound();

  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const blocks: ExamBlock[] = (raw.blocks ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b: any) => ({
      block_id: b.block_id,
      exam_skill: b.exam_skill,
      exercise_type: b.exercise_type,
      title: b.title,
      instruction: b.instruction,
      items: b.items ?? [],
      max_plays: b.max_plays,
      audio_url: b.audio_url,
      transcript:
        b.exercise_type === 'multiple-choice'
          ? loadTranscript(params.lessonId, b.source)
          : undefined,
    })
  );

  const data: ExamExercise = {
    lesson_id: raw.lesson_id,
    title: raw.title,
    instruction: raw.instruction ?? raw.instructions,
    blocks,
  };

  const blockIds = parseBlockIds(searchParams?.blocks);

  return <ExamTasks data={data} blockIds={blockIds} />;
}

import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import type {
  FlipTaskExercise,
  GrammarPyramidExercise,
  HomeworkExercise,
  PictureSetExercise,
  QueueExerciseBundle,
  VocabCardsExercise,
} from './queue-types';

const ROOT = path.join(process.cwd(), 'src/content/queue-published');

function readJson<T>(file: string): T | null {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf8')) as T;
}

export function getQueueBundle(lessonId: string): QueueExerciseBundle | null {
  const vocab = readJson<VocabCardsExercise>(`${lessonId}-vocab.json`);
  const pictures = readJson<PictureSetExercise>(`${lessonId}-pictures.json`);
  const commTasks = readJson<FlipTaskExercise>(`${lessonId}-comm-tasks.json`);
  const grammar = readJson<GrammarPyramidExercise>(`${lessonId}-grammar.json`);
  const hw = readJson<HomeworkExercise>(`${lessonId}-hw.json`);
  if (!vocab || !pictures || !commTasks || !grammar || !hw) return null;
  return { vocab, pictures, commTasks, grammar, hw };
}

export function listPublishedLessonIds(): string[] {
  if (!existsSync(ROOT)) return [];
  const files = readdirSync(ROOT);
  const ids = new Set<string>();
  for (const f of files) {
    const m = f.match(/^(.+)-vocab\.json$/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

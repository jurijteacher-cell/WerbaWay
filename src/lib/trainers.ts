import { notFound } from 'next/navigation';
import path from 'path';
import { readExerciseJson } from '@/lib/content-locale';
import { getLocale } from '@/i18n/server';

/** Тренажери A0: /embed/{lesson_id}/{kind} читає {lesson_id}-{kind}.json мовою учня. */
export const TRAINER_KINDS = ['alfabet', 'sluchaj-wybierz', 'czytaj-glosno', 'liczby', 'dialogi', 'czytanie', 'mapa-pl'] as const;
export type TrainerKind = (typeof TRAINER_KINDS)[number];

export function loadTrainer<T>(lessonId: string, kind: TrainerKind): T {
  const data = readExerciseJson<T>(`${path.basename(lessonId)}-${kind}.json`, getLocale());
  if (!data) notFound();
  return data;
}

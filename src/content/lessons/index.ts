import type { Lesson } from '../types';
import { lesson1Hello } from './lesson-1-hello';

// Додаючи новий урок: створи файл lesson-N-slug.ts за зразком lesson-1-hello.ts
// і додай його сюди.
export const lessons: Lesson[] = [lesson1Hello];

export function getLessonBySlug(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}

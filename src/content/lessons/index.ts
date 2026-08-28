import type { Lesson } from '../types';
import { lesson1Hello } from './lesson-1-hello';
import { lessonSlownictwoFilmowe } from './slownictwo-filmowe';
import { lessonGatunkiFilmowe } from './gatunki-filmowe';
import {
  movieTitanic,
  movieHarryPotter,
  movieFrozen,
  movieHomeAlone,
  movieAvengers,
  movieIntouchables,
} from './movies';

// Додаючи новий урок: створи файл lesson-N-slug.ts за зразком lesson-1-hello.ts
// і додай його сюди.
export const lessons: Lesson[] = [
  lesson1Hello,
  lessonSlownictwoFilmowe,
  lessonGatunkiFilmowe,
  movieTitanic,
  movieHarryPotter,
  movieFrozen,
  movieHomeAlone,
  movieAvengers,
  movieIntouchables,
];

export function getLessonBySlug(slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}

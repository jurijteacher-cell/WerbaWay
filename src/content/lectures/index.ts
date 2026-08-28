import type { Lecture } from '../types';
import { lectureKino } from './kino';

export const lectures: Lecture[] = [lectureKino];

export function getLectureBySlug(slug: string): Lecture | undefined {
  return lectures.find((l) => l.slug === slug);
}

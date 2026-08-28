import type { Lecture } from '../types';
import { lessonSlownictwoFilmowe } from '../lessons/slownictwo-filmowe';
import { lessonGatunkiFilmowe } from '../lessons/gatunki-filmowe';

// Фільми (Titanic, Harry Potter тощо) — окремий практичний віджет,
// /lectures/kino/movies, не тут (див. коментар в movies.ts).
export const lectureKino: Lecture = {
  slug: 'kino',
  title: 'Кіно',
  subtitle: 'Кіно-лексика',
  sections: [
    {
      id: 'slownictwo',
      label: 'Słownictwo filmowe',
      lessonSlug: lessonSlownictwoFilmowe.slug,
      exercises: lessonSlownictwoFilmowe.exercises,
    },
    {
      id: 'gatunki',
      label: 'Gatunki filmowe',
      lessonSlug: lessonGatunkiFilmowe.slug,
      exercises: lessonGatunkiFilmowe.exercises,
    },
  ],
};

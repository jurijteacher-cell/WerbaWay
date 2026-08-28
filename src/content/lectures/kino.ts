import type { Lecture } from '../types';
import { lessonSlownictwoFilmowe } from '../lessons/slownictwo-filmowe';
import {
  movieTitanic,
  movieHarryPotter,
  movieFrozen,
  movieHomeAlone,
  movieAvengers,
  movieIntouchables,
} from '../lessons/movies';

// Вправи не дублюються — беремо їх напряму з уроків. Якщо поправиш питання
// в movies.ts чи slownictwo-filmowe.ts, лекція оновиться сама.
export const lectureKino: Lecture = {
  slug: 'kino',
  title: 'Кіно',
  subtitle: 'Лексика + обговорення популярних фільмів',
  sections: [
    {
      id: 'slownictwo',
      label: 'Słownictwo filmowe',
      lessonSlug: lessonSlownictwoFilmowe.slug,
      exercises: lessonSlownictwoFilmowe.exercises,
    },
    { id: 'titanic', label: 'Titanic', lessonSlug: movieTitanic.slug, exercises: movieTitanic.exercises },
    {
      id: 'harry-potter',
      label: 'Harry Potter',
      lessonSlug: movieHarryPotter.slug,
      exercises: movieHarryPotter.exercises,
    },
    { id: 'frozen', label: 'Kraina Lodu', lessonSlug: movieFrozen.slug, exercises: movieFrozen.exercises },
    { id: 'home-alone', label: 'Sam w domu', lessonSlug: movieHomeAlone.slug, exercises: movieHomeAlone.exercises },
    { id: 'avengers', label: 'Avengers', lessonSlug: movieAvengers.slug, exercises: movieAvengers.exercises },
    {
      id: 'intouchables',
      label: 'Nietykalni',
      lessonSlug: movieIntouchables.slug,
      exercises: movieIntouchables.exercises,
    },
  ],
};

import type { Lecture } from '../types';
import { lessonSlownictwoFilmowe } from '../lessons/slownictwo-filmowe';

// Фільми (Titanic, Harry Potter тощо) більше НЕ тут — вони не вписувались
// у формат "вправа за вправою" з навігацією по сайдбару. Це окремий
// практичний віджет: /lectures/kino/movies (сітка карток → модалка з
// питаннями → 3 покази на фільм, без збереження відповідей — чисто
// практика для говоріння, як у твоєму оригінальному файлі).
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
  ],
};

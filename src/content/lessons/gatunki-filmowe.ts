import type { Lesson } from '../types';

// Перенесено з gatunki_filmowe_dopasowanie.html (Notion → GitHub Pages).
// Оригінал: клікаєш жанр зліва, потім опис справа; якщо збіглось — обидва
// гаснуть зеленим і йдуть у "плівку" прогресу зверху; якщо ні — трясуться
// червоним і скидаються. Точна поведінка — variant: 'click' у Matching.
export const lessonGatunkiFilmowe: Lesson = {
  slug: 'gatunki-filmowe',
  title: 'Gatunki filmowe',
  subtitle: 'Дібери опис до жанру',
  category: 'słownictwo i komunikacja',
  hideFromBrowse: true, // тільки всередині лекції "Кіно" — /lectures/kino
  content: ['Клікни жанр зліва, потім опис справа. Якщо вони збігаються — пара "гасне" і йде в прогрес нагорі.'],
  exercises: [
    {
      id: 'gatunki-1',
      type: 'matching',
      variant: 'click',
      prompt: 'Dopasuj gatunek do opisu',
      pairs: [
        {
          id: 'g1',
          left: 'Komedia',
          right: 'Film, który nas rozśmiesza. Ma wesołą historię i zwykle szczęśliwy koniec.',
        },
        { id: 'g2', left: 'Horror', right: 'Film, który nas straszy. Jest w nim dużo strachu i napięcia.' },
        {
          id: 'g3',
          left: 'Animacja',
          right: 'Film narysowany albo zrobiony na komputerze, często dla dzieci.',
        },
        { id: 'g4', left: 'Romans', right: 'Film o miłości między dwiema osobami.' },
        {
          id: 'g5',
          left: 'Dokument',
          right: 'Film o prawdziwych ludziach i wydarzeniach — to nie jest wymyślona historia.',
        },
        { id: 'g6', left: 'Dramat', right: 'Film o poważnych problemach ludzi i ich trudnych uczuciach.' },
        { id: 'g7', left: 'Kryminał', right: 'Film o przestępstwie. Policja szuka osoby, która to zrobiła.' },
        { id: 'g8', left: 'Science fiction', right: 'Film o przyszłości, kosmosie albo nowej technologii.' },
      ],
    },
  ],
};

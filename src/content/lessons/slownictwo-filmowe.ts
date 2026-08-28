import type { Lesson } from '../types';

// Перенесено з slownictwo_filmowe_v2_fixed.html (Notion → GitHub Pages).
// Оригінал: drag&drop слово→визначення, 20 слів у 5 категоріях.
// Тут: та сама лексика й визначення (польською, як у тебе — навмисно не перекладав),
// розбита на 5 окремих matching-вправ по категоріях. Drag&drop замінено на
// dropdown-select — той самий принцип, простіша реалізація на старті.
export const lessonSlownictwoFilmowe: Lesson = {
  slug: 'slownictwo-filmowe',
  title: 'Słownictwo filmowe',
  subtitle: 'Кіно-лексика: хто, що і як',
  category: 'słownictwo i komunikacja',
  hideFromBrowse: true, // тепер тільки всередині лекції "Кіно" — /lectures/kino
  content: [
    'Це база слів, які знадобляться, щоб говорити про фільми та серіали польською: хто над ними працює, з чого вони складаються, і як ми їх дивимось.',
    'Визначення навмисно написані простою польською, а не перекладені — так одразу тренуєш розуміння мови, а не просто запам\'ятовуєш переклад.',
  ],
  exercises: [
    {
      id: 'film-vocab-osoby',
      type: 'matching',
      prompt: 'Osoby — з\'єднай слово з визначенням',
      pairs: [
        { id: 'osoby-1', left: 'aktor / aktorka', right: 'Gra postać w filmie.' },
        { id: 'osoby-2', left: 'reżyser', right: 'Kieruje pracą na planie i decyduje, jak będzie wyglądał film.' },
        { id: 'osoby-3', left: 'scenarzysta', right: 'Pisze historię i dialogi do filmu.' },
        { id: 'osoby-4', left: 'producent', right: 'Organizuje pieniądze i pracę potrzebną do zrobienia filmu.' },
      ],
    },
    {
      id: 'film-vocab-produkcja',
      type: 'matching',
      prompt: 'Produkcja — з\'єднай слово з визначенням',
      pairs: [
        { id: 'produkcja-1', left: 'scenariusz', right: 'Tekst z historią i dialogami, według którego grają aktorzy.' },
        { id: 'produkcja-2', left: 'ścieżka dźwiękowa', right: 'Muzyka, która gra w filmie.' },
        {
          id: 'produkcja-3',
          left: 'efekty specjalne',
          right: 'Obrazy zrobione na komputerze, które pokazują rzeczy niemożliwe w prawdziwym życiu.',
        },
        { id: 'produkcja-4', left: 'charakteryzacja', right: 'Makijaż i fryzura, które zmieniają wygląd aktora.' },
        { id: 'produkcja-5', left: 'plan filmowy', right: 'Miejsce, gdzie nagrywa się film.' },
      ],
    },
    {
      id: 'film-vocab-struktura',
      type: 'matching',
      prompt: 'Struktura — з\'єднай слово з визначенням',
      pairs: [
        { id: 'struktura-1', left: 'scena', right: 'Mała część filmu — jedna sytuacja pokazana w jednym miejscu.' },
        { id: 'struktura-2', left: 'odcinek', right: 'Jedna część serialu.' },
        { id: 'struktura-3', left: 'sezon', right: 'Grupa odcinków serialu, pokazywana razem, zwykle raz w roku.' },
        { id: 'struktura-4', left: 'fabuła', right: 'Historia pokazana w filmie — co się dzieje od początku do końca.' },
      ],
    },
    {
      id: 'film-vocab-ogladanie',
      type: 'matching',
      prompt: 'Oglądanie — з\'єднай слово з визначенням',
      pairs: [
        { id: 'ogladanie-1', left: 'napisy', right: 'Tekst na dole ekranu, który pokazuje, co mówią aktorzy.' },
        {
          id: 'ogladanie-2',
          left: 'dubbing',
          right: 'Nowe głosy nagrane w innym języku zamiast oryginalnych głosów aktorów.',
        },
        { id: 'ogladanie-3', left: 'lektor', right: 'Jedna osoba, która czyta wszystkie dialogi filmu po polsku.' },
      ],
    },
    {
      id: 'film-vocab-dystrybucja',
      type: 'matching',
      prompt: 'Dystrybucja i uznanie — з\'єднай слово з визначенням',
      pairs: [
        { id: 'dystrybucja-1', left: 'premiera', right: 'Pierwszy pokaz filmu dla publiczności.' },
        { id: 'dystrybucja-2', left: 'obsada', right: 'Wszyscy aktorzy, którzy grają w filmie.' },
        { id: 'dystrybucja-3', left: 'nagroda', right: 'Coś, co dostaje film albo aktor za dobrą pracę.' },
        { id: 'dystrybucja-4', left: 'kasa', right: 'Pieniądze, które film zarobił w kinach.' },
      ],
    },
  ],
};

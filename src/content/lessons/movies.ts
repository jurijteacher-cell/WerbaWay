import type { Lesson } from '../types';

// Перенесено з popularne_filmy_quiz.html (Notion → GitHub Pages).
// Оригінал: сітка постерів, клік відкриває модалку з 5 питаннями, кожен фільм
// повторюється 3 рази (spaced repetition), кнопка "Pokaż przykładową odpowiedź".
// Тут: той самий текст питань і прикладів відповідей, по фільму на окремий урок
// (замість сітки постерів — постери не переношу, це кадри з фільмів, авторське
// право). Повторення 3 рази поки не реалізовано — це вже про прогрес/повторення,
// той самий пункт, що вже в списку "наступних кроків" у README.

const intro = [
  'Дивись на назву фільму й відповідай польською письмово — своїми словами, як умієш.',
  'Якщо не знаєш, з чого почати, натисни "Показати приклад відповіді" під полем — це не єдина правильна відповідь, а орієнтир.',
];

export const movieTitanic: Lesson = {
  slug: 'movie-titanic',
  title: 'Titanic',
  subtitle: 'Mówienie o filmach — bohaterowie',
  category: 'Mówienie o filmach',
  content: intro,
  exercises: [
    {
      id: 'titanic-1',
      type: 'open_text',
      prompt: 'Opisz krótko charakter Jacka. Jaki on jest?',
      sampleAnswer: 'Jack jest odważny, wolny i optymistyczny. Kocha życie, sztukę i przygody.',
    },
    {
      id: 'titanic-2',
      type: 'open_text',
      prompt: 'Opisz charakter Rose na początku filmu.',
      sampleAnswer: 'Rose jest smutna i czuje się uwięziona. Musi robić to, czego chce jej rodzina.',
    },
    {
      id: 'titanic-3',
      type: 'open_text',
      prompt: 'Jak zmienia się Rose pod koniec filmu?',
      sampleAnswer: 'Rose staje się silna i wolna. Sama decyduje o swoim życiu.',
    },
    {
      id: 'titanic-4',
      type: 'open_text',
      prompt: 'Dlaczego, twoim zdaniem, Jack i Rose się zakochują?',
      sampleAnswer: 'Są bardzo różni, ale rozumieją się i czują się przy sobie wolni.',
    },
    {
      id: 'titanic-5',
      type: 'open_text',
      prompt: 'Jaka jest twoim zdaniem najważniejsza lekcja z tego filmu?',
      sampleAnswer: 'Trzeba żyć odważnie i słuchać własnego serca.',
    },
  ],
};

export const movieHarryPotter: Lesson = {
  slug: 'movie-harry-potter',
  title: 'Harry Potter i Kamień Filozoficzny',
  subtitle: 'Mówienie o filmach — bohaterowie',
  category: 'Mówienie o filmach',
  content: intro,
  exercises: [
    {
      id: 'harrypotter-1',
      type: 'open_text',
      prompt: "Opisz charakter Harry'ego.",
      sampleAnswer: 'Harry jest odważny, skromny i bardzo lojalny wobec przyjaciół.',
    },
    {
      id: 'harrypotter-2',
      type: 'open_text',
      prompt: 'Jaki charakter ma Ron?',
      sampleAnswer: 'Ron jest zabawny i lojalny, ale czasem trochę niepewny siebie.',
    },
    {
      id: 'harrypotter-3',
      type: 'open_text',
      prompt: 'Jaki charakter ma Hermiona?',
      sampleAnswer: 'Hermiona jest mądra, pracowita i zawsze pomaga przyjaciołom.',
    },
    {
      id: 'harrypotter-4',
      type: 'open_text',
      prompt: 'Dlaczego przyjaźń między Harrym, Ronem i Hermioną jest ważna w filmie?',
      sampleAnswer: 'Razem są silniejsi i pomagają sobie w trudnych sytuacjach.',
    },
    {
      id: 'harrypotter-5',
      type: 'open_text',
      prompt: 'Co sądzisz o świecie magii pokazanym w filmie?',
      sampleAnswer: 'To bardzo ciekawy i kolorowy świat, inny niż nasza codzienność.',
    },
  ],
};

export const movieFrozen: Lesson = {
  slug: 'movie-frozen',
  title: 'Kraina Lodu',
  subtitle: 'Mówienie o filmach — bohaterowie',
  category: 'Mówienie o filmach',
  content: intro,
  exercises: [
    {
      id: 'frozen-1',
      type: 'open_text',
      prompt: 'Opisz charakter Elsy.',
      sampleAnswer: 'Elsa jest niepewna siebie i boi się swojej mocy, ale jest też bardzo silna.',
    },
    {
      id: 'frozen-2',
      type: 'open_text',
      prompt: 'Opisz charakter Anny.',
      sampleAnswer: 'Anna jest odważna, ciepła i bardzo kocha swoją siostrę.',
    },
    {
      id: 'frozen-3',
      type: 'open_text',
      prompt: 'Dlaczego Elsa ucieka na początku filmu?',
      sampleAnswer: 'Boi się, że przypadkiem skrzywdzi innych swoją magią.',
    },
    {
      id: 'frozen-4',
      type: 'open_text',
      prompt: 'Co pomaga Elsie zaakceptować samą siebie?',
      sampleAnswer: 'Miłość siostry i wsparcie bliskich osób.',
    },
    {
      id: 'frozen-5',
      type: 'open_text',
      prompt: 'Jaka jest główna lekcja tego filmu o rodzinie?',
      sampleAnswer: 'Prawdziwa miłość i akceptacja są ważniejsze niż strach.',
    },
  ],
};

export const movieHomeAlone: Lesson = {
  slug: 'movie-home-alone',
  title: 'Sam w domu',
  subtitle: 'Mówienie o filmach — bohaterowie',
  category: 'Mówienie o filmach',
  content: intro,
  exercises: [
    {
      id: 'homealone-1',
      type: 'open_text',
      prompt: 'Opisz charakter Kevina na początku filmu.',
      sampleAnswer: 'Kevin czuje się niechciany i trochę zły na swoją rodzinę.',
    },
    {
      id: 'homealone-2',
      type: 'open_text',
      prompt: 'Jak zmienia się Kevin, gdy zostaje sam w domu?',
      sampleAnswer: 'Staje się bardziej dojrzały, odważny i pomysłowy.',
    },
    {
      id: 'homealone-3',
      type: 'open_text',
      prompt: 'Opisz charakter złodziei w filmie.',
      sampleAnswer: 'Są zabawni, ale też trochę niebezpieczni i niezbyt sprytni.',
    },
    {
      id: 'homealone-4',
      type: 'open_text',
      prompt: 'Dlaczego Kevin broni swojego domu?',
      sampleAnswer: 'To jego dom i chce czuć się w nim bezpiecznie.',
    },
    {
      id: 'homealone-5',
      type: 'open_text',
      prompt: 'Czego uczy się Kevin o swojej rodzinie pod koniec filmu?',
      sampleAnswer: 'Uczy się, że bardzo kocha swoją rodzinę i tęskni za nią.',
    },
  ],
};

export const movieAvengers: Lesson = {
  slug: 'movie-avengers',
  title: 'Avengers: Koniec gry',
  subtitle: 'Mówienie o filmach — bohaterowie',
  category: 'Mówienie o filmach',
  content: intro,
  exercises: [
    {
      id: 'avengers-1',
      type: 'open_text',
      prompt: "Opisz charakter Iron Mana (Tony'ego Starka).",
      sampleAnswer: 'Jest inteligentny, pewny siebie i czasem trochę ironiczny.',
    },
    {
      id: 'avengers-2',
      type: 'open_text',
      prompt: 'Opisz charakter Thora.',
      sampleAnswer: 'Thor jest silny i dumny, ale też bardzo lojalny wobec przyjaciół.',
    },
    {
      id: 'avengers-3',
      type: 'open_text',
      prompt: 'Jaki charakter ma Thanos?',
      sampleAnswer: 'Thanos wierzy, że robi coś dobrego, ale jego metody są okrutne.',
    },
    {
      id: 'avengers-4',
      type: 'open_text',
      prompt: 'Dlaczego bohaterowie muszą ze sobą współpracować?',
      sampleAnswer: 'Sami są za słabi, żeby pokonać tak silnego przeciwnika.',
    },
    {
      id: 'avengers-5',
      type: 'open_text',
      prompt: 'Co poświęcają bohaterowie, żeby wygrać?',
      sampleAnswer: 'Poświęcają swój czas, bezpieczeństwo, a niektórzy nawet życie.',
    },
  ],
};

export const movieIntouchables: Lesson = {
  slug: 'movie-intouchables',
  title: 'Nietykalni (1+1)',
  subtitle: 'Mówienie o filmach — bohaterowie',
  category: 'Mówienie o filmach',
  content: intro,
  exercises: [
    {
      id: 'intouchables-1',
      type: 'open_text',
      prompt: "Opisz charakter Philippe'a (mężczyzny na wózku).",
      sampleAnswer: 'Jest inteligentny, ma poczucie humoru, ale czuje się samotny.',
    },
    {
      id: 'intouchables-2',
      type: 'open_text',
      prompt: 'Opisz charakter Drissa (jego opiekuna).',
      sampleAnswer: 'Driss jest energiczny, szczery i bardzo bezpośredni.',
    },
    {
      id: 'intouchables-3',
      type: 'open_text',
      prompt: 'Jak zmienia się relacja między bohaterami w trakcie filmu?',
      sampleAnswer: 'Z czasem stają się prawdziwymi przyjaciółmi.',
    },
    {
      id: 'intouchables-4',
      type: 'open_text',
      prompt: "Czego Driss uczy Philippe'a?",
      sampleAnswer: 'Uczy go cieszyć się życiem i śmiać się z trudności.',
    },
    {
      id: 'intouchables-5',
      type: 'open_text',
      prompt: "Czego Driss uczy się od Philippe'a?",
      sampleAnswer: 'Uczy się odpowiedzialności i innego spojrzenia na życie.',
    },
  ],
};

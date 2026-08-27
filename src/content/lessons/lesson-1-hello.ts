import type { Lesson } from '../types';

export const lesson1Hello: Lesson = {
  slug: 'lesson-1-hello',
  title: 'Вітання',
  subtitle: 'Перші фрази, які почуєш у Польщі',
  content: [
    'Польською "Cześć" — неформальне "привіт" або "бувай", використовується з друзями чи однолітками.',
    '"Dzień dobry" — формальне вітання, буквально "добрий день", використовується вдень з незнайомими людьми, на роботі, у магазинах.',
    '"Dobry wieczór" — "добрий вечір", вживається ввечері у формальних ситуаціях.',
    '"Do widzenia" — формальне прощання, "до побачення".',
  ],
  exercises: [
    {
      id: 'ex-1-mc',
      type: 'multiple_choice',
      prompt: 'Як формально привітатись удень з новим клієнтом?',
      options: ['Cześć', 'Dzień dobry', 'Do widzenia', 'Dobranoc'],
      correctIndex: 1,
    },
    {
      id: 'ex-2-fill',
      type: 'fill_blank',
      prompt: 'Заповни пропуск',
      textWithBlank: 'Ввечері, входячи до ресторану, ти кажеш офіціантці: "___".',
      correctAnswers: ['Dobry wieczór', 'dobry wieczor'],
    },
    {
      id: 'ex-3-match',
      type: 'matching',
      prompt: 'З\'єднай польську фразу з українським перекладом',
      pairs: [
        { id: 'p1', left: 'Cześć', right: 'Привіт / Бувай' },
        { id: 'p2', left: 'Dzień dobry', right: 'Добрий день' },
        { id: 'p3', left: 'Do widzenia', right: 'До побачення' },
        { id: 'p4', left: 'Dobry wieczór', right: 'Добрий вечір' },
      ],
    },
    {
      id: 'ex-4-open',
      type: 'open_text',
      prompt: 'Опиши своїми словами: у якій ситуації ти б використав "Cześć", а не "Dzień dobry"? Наведи приклад.',
      placeholder: 'Наприклад, коли зустрічаю однокурсника в коридорі...',
    },
    {
      id: 'ex-5-listen',
      type: 'listening',
      prompt: 'Прослухай і обери, що почув(-ла)',
      // Заміни на реальний файл (завантаж у Supabase Storage і встав публічний URL)
      audioUrl: '/audio/placeholder.mp3',
      options: ['Dzień dobry', 'Dobry wieczór', 'Do widzenia', 'Dobranoc'],
      correctIndex: 0,
    },
  ],
};

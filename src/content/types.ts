// ── "Повні" типи (живуть тільки на сервері — містять правильні відповіді) ──

export type ExerciseType = 'multiple_choice' | 'fill_blank' | 'matching' | 'open_text' | 'listening';

interface BaseExercise {
  id: string;
  type: ExerciseType;
  prompt: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'multiple_choice';
  options: string[];
  correctIndex: number;
}

export interface ListeningExercise extends BaseExercise {
  type: 'listening';
  audioUrl: string;
  options: string[];
  correctIndex: number;
}

export interface FillBlankExercise extends BaseExercise {
  type: 'fill_blank';
  /** Речення з "___" на місці пропуску */
  textWithBlank: string;
  /** Прийнятні варіанти відповіді (порівнюються без урахування регістру/пробілів) */
  correctAnswers: string[];
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchingExercise extends BaseExercise {
  type: 'matching';
  pairs: MatchingPair[];
}

export interface OpenTextExercise extends BaseExercise {
  type: 'open_text';
  placeholder?: string;
  /** Приклад гарної відповіді — не "правильна відповідь", тому можна показувати одразу, без сервера */
  sampleAnswer?: string;
}

export type Exercise =
  | MultipleChoiceExercise
  | ListeningExercise
  | FillBlankExercise
  | MatchingExercise
  | OpenTextExercise;

export interface Lesson {
  slug: string;
  title: string;
  subtitle?: string;
  /** Групування на головній сторінці — відповідає вкладкам з твого Notion (słownictwo i komunikacja тощо) */
  category?: string;
  /** Абзаци контенту уроку (просто текст, пізніше можна замінити на MDX) */
  content: string[];
  exercises: Exercise[];
}

// ── "Публічні" типи (те, що реально йде в браузер — без правильних відповідей) ──

export type PublicExercise =
  | { id: string; type: 'multiple_choice'; prompt: string; options: string[] }
  | { id: string; type: 'listening'; prompt: string; audioUrl: string; options: string[] }
  | { id: string; type: 'fill_blank'; prompt: string; textWithBlank: string }
  | {
      id: string;
      type: 'matching';
      prompt: string;
      leftItems: { id: string; left: string }[];
      rightItems: string[];
    }
  | { id: string; type: 'open_text'; prompt: string; placeholder?: string; sampleAnswer?: string };

export interface PublicLesson {
  slug: string;
  title: string;
  subtitle?: string;
  category?: string;
  content: string[];
  exercises: PublicExercise[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * КРИТИЧНО: єдине місце, де "повна" вправа перетворюється на публічну.
 * Ніколи не передавай Exercise напряму в клієнтський компонент — тільки через це.
 */
export function toPublicExercise(ex: Exercise): PublicExercise {
  switch (ex.type) {
    case 'multiple_choice':
      return { id: ex.id, type: 'multiple_choice', prompt: ex.prompt, options: ex.options };
    case 'listening':
      return { id: ex.id, type: 'listening', prompt: ex.prompt, audioUrl: ex.audioUrl, options: ex.options };
    case 'fill_blank':
      return { id: ex.id, type: 'fill_blank', prompt: ex.prompt, textWithBlank: ex.textWithBlank };
    case 'matching':
      return {
        id: ex.id,
        type: 'matching',
        prompt: ex.prompt,
        leftItems: ex.pairs.map((p) => ({ id: p.id, left: p.left })),
        rightItems: shuffle(ex.pairs.map((p) => p.right)),
      };
    case 'open_text':
      return { id: ex.id, type: 'open_text', prompt: ex.prompt, placeholder: ex.placeholder, sampleAnswer: ex.sampleAnswer };
  }
}

export function toPublicLesson(lesson: Lesson): PublicLesson {
  return {
    slug: lesson.slug,
    title: lesson.title,
    subtitle: lesson.subtitle,
    category: lesson.category,
    content: lesson.content,
    exercises: lesson.exercises.map(toPublicExercise),
  };
}

// ── Лекція: навігований набір вправ, зібраних з одного або кількох уроків ──
//
// Важливо: лекція НЕ дублює контент і НЕ вводить окреме сховище відповідей.
// Кожна секція вказує lessonSlug — саме той урок, якому "належать" вправи
// секції для оцінювання й збереження в submissions (той самий механізм,
// що й на сторінці /lessons/[slug]). Лекція — це просто інший спосіб
// навігації по вже існуючих вправах, зручний для живого проведення заняття.

export interface LectureSection {
  id: string;
  label: string;
  /** Урок, якому належать вправи цієї секції — потрібен для /api/submit */
  lessonSlug: string;
  exercises: Exercise[];
}

export interface Lecture {
  slug: string;
  title: string;
  subtitle?: string;
  sections: LectureSection[];
}

export interface PublicLectureSection {
  id: string;
  label: string;
  lessonSlug: string;
  exercises: PublicExercise[];
}

export interface PublicLecture {
  slug: string;
  title: string;
  subtitle?: string;
  sections: PublicLectureSection[];
}

export function toPublicLecture(lecture: Lecture): PublicLecture {
  return {
    slug: lecture.slug,
    title: lecture.title,
    subtitle: lecture.subtitle,
    sections: lecture.sections.map((s) => ({
      id: s.id,
      label: s.label,
      lessonSlug: s.lessonSlug,
      exercises: s.exercises.map(toPublicExercise),
    })),
  };
}

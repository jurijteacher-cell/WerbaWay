/** Types for content-queue exercise JSON (Claude handoff → LMS embeds). */

export type VocabCardsExercise = {
  lesson_id: string;
  exercise_type: 'vocab-cards';
  title: string;
  instructions?: string;
  groups?: string[];
  items: {
    id: number | string;
    term: string;
    definition: string;
    example_sentence: string;
    part_of_speech?: string;
    translation_uk?: string;
    group?: string;
  }[];
  meta?: { estimated_minutes?: number };
};

export type PicturePairImage = {
  role?: string;
  image_keywords?: string;
  alt?: string;
  image_url?: string;
};

export type PictureSetExercise = {
  lesson_id: string;
  exercise_type: 'picture-set';
  title: string;
  instructions?: string;
  image_constraints?: string;
  layout?: string;
  phrase_bank?: string[];
  items: {
    id: number | string;
    question: string;
    label?: string;
    note?: string;
    /** Legacy single-image shape */
    image_keywords?: string;
    alt?: string;
    image_url?: string;
    /** Then/now pair shape */
    images?: PicturePairImage[];
  }[];
};

export type FlipTaskExercise = {
  lesson_id: string;
  exercise_type: 'flip-task';
  title: string;
  instructions?: string;
  items: {
    id: number | string;
    front_title: string;
    back_scenario: string;
    back_checklist: string[];
  }[];
};

export type GrammarPyramidItem = {
  id: number | string;
  prompt?: string;
  answer?: string;
  answer_hint?: string;
  sentence?: string;
  words?: string[];
  options?: string[];
  explanation?: string;
};

export type GrammarPyramidExercise = {
  lesson_id: string;
  exercise_type: string;
  title: string;
  instructions?: string;
  levels: {
    level: number;
    name: string;
    task_type: string;
    instruction?: string;
    items: GrammarPyramidItem[];
  }[];
};

export type HomeworkExercise = {
  lesson_id: string;
  exercise_type: string;
  title: string;
  instructions?: string;
  /** Legacy pl-preg shape */
  vocab_review?: string;
  video?: { title: string; url: string; task: string };
  grammar_exercises?: Array<{
    id: number;
    sentence?: string;
    answer?: string;
    words?: string[];
    prompt?: string;
  }>;
  writing_task?: { type: string; prompt: string };
  /** Newer block pyramid shape (same as grammar blocks, normalized to levels) */
  levels?: GrammarPyramidExercise['levels'];
};

export type QueueExerciseBundle = {
  vocab: VocabCardsExercise;
  pictures: PictureSetExercise;
  commTasks: FlipTaskExercise;
  grammar: GrammarPyramidExercise;
  hw: HomeworkExercise;
};

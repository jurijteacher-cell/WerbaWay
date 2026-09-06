/** Types for content-queue exercise JSON (Claude handoff → LMS embeds). */

export type VocabCardsExercise = {
  lesson_id: string;
  exercise_type: 'vocab-cards';
  title: string;
  instructions?: string;
  items: { id: number; term: string; definition: string; example_sentence: string }[];
  meta?: { estimated_minutes?: number };
};

export type PictureSetExercise = {
  lesson_id: string;
  exercise_type: 'picture-set';
  title: string;
  instructions?: string;
  items: {
    id: number;
    image_keywords: string;
    question: string;
    /** Resolved after image pipeline */
    image_url?: string;
  }[];
};

export type FlipTaskExercise = {
  lesson_id: string;
  exercise_type: 'flip-task';
  title: string;
  items: {
    id: number;
    front_title: string;
    back_scenario: string;
    back_checklist: string[];
  }[];
};

export type GrammarPyramidExercise = {
  lesson_id: string;
  exercise_type: 'matching' | string;
  title: string;
  instructions?: string;
  levels: {
    level: number;
    name: string;
    task_type: 'matching' | 'fill-in-blank' | 'sentence-building' | 'open-answer' | string;
    items: Array<{
      id: number;
      prompt?: string;
      answer?: string;
      sentence?: string;
      words?: string[];
    }>;
  }[];
};

export type HomeworkExercise = {
  lesson_id: string;
  exercise_type: 'homework';
  title: string;
  vocab_review: string;
  video: { title: string; url: string; task: string };
  grammar_exercises: Array<{
    id: number;
    sentence?: string;
    answer?: string;
    words?: string[];
    prompt?: string;
  }>;
  writing_task: { type: string; prompt: string };
};

export type QueueExerciseBundle = {
  vocab: VocabCardsExercise;
  pictures: PictureSetExercise;
  commTasks: FlipTaskExercise;
  grammar: GrammarPyramidExercise;
  hw: HomeworkExercise;
};

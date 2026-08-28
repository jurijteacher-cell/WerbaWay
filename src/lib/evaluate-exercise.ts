import type { Exercise } from '@/content/types';
import { grade } from '@/lib/grading';
import { gradeOpenText } from '@/lib/grade-open-text';

export type ExerciseEvaluation = {
  isCorrect: boolean | null;
  autoGraded: boolean;
  feedback?: string;
};

/** Серверна перевірка будь-якого типу вправи. open_text — через GPT-4o, якщо є OPENAI_API_KEY. */
export async function evaluateExercise(exercise: Exercise, answer: unknown): Promise<ExerciseEvaluation> {
  if (exercise.type === 'open_text') {
    const text = typeof (answer as { text?: unknown })?.text === 'string' ? (answer as { text: string }).text : '';
    const ai = await gradeOpenText(exercise, text);
    if (ai) {
      return { isCorrect: ai.isCorrect, autoGraded: true, feedback: ai.feedback };
    }
    return { isCorrect: null, autoGraded: false };
  }

  const isCorrect = grade(exercise, answer);
  return { isCorrect, autoGraded: isCorrect !== null };
}

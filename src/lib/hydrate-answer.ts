import type { PublicExercise } from '@/content/types';
import type { SavedSubmission } from '@/lib/submission-types';

export function hydrateAnswerState(
  exercise: PublicExercise,
  saved: SavedSubmission
): { mcValue: number | null; textValue: string; matchValue: Record<string, string> } {
  const answer = saved.answer as Record<string, unknown>;
  switch (exercise.type) {
    case 'multiple_choice':
    case 'listening':
      return {
        mcValue: typeof answer.selectedIndex === 'number' ? answer.selectedIndex : null,
        textValue: '',
        matchValue: {},
      };
    case 'fill_blank':
    case 'open_text':
      return {
        mcValue: null,
        textValue: typeof answer.text === 'string' ? answer.text : '',
        matchValue: {},
      };
    case 'matching':
      return {
        mcValue: null,
        textValue: '',
        matchValue: typeof answer.pairs === 'object' && answer.pairs !== null ? (answer.pairs as Record<string, string>) : {},
      };
  }
}

export function savedToResult(saved: SavedSubmission) {
  return {
    ok: true as const,
    autoGraded: saved.autoGraded,
    isCorrect: saved.isCorrect,
    feedback: saved.teacherFeedback,
  };
}

export function isSubmissionLocked(saved: SavedSubmission | null, result: { ok: true; autoGraded: boolean; isCorrect: boolean | null } | null) {
  if (!result?.ok) return false;
  if (result.autoGraded) return true;
  return result.isCorrect !== null;
}

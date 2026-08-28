import type { Exercise } from '@/content/types';

export function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Повертає null, якщо тип не перевіряється автоматично (open_text) */
export function grade(exercise: Exercise, answer: any): boolean | null {
  switch (exercise.type) {
    case 'multiple_choice':
    case 'listening':
      return answer?.selectedIndex === exercise.correctIndex;
    case 'fill_blank':
      return exercise.correctAnswers.some((a) => normalize(a) === normalize(answer?.text ?? ''));
    case 'matching': {
      const submitted: Record<string, string> = answer?.pairs ?? {};
      return exercise.pairs.every((p) => normalize(submitted[p.id] ?? '') === normalize(p.right));
    }
    case 'open_text':
      return null;
  }
}

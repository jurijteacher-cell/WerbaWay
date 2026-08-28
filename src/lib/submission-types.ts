export type SavedSubmission = {
  exerciseId: string;
  lessonSlug: string;
  answer: unknown;
  isCorrect: boolean | null;
  autoGraded: boolean;
  teacherFeedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
};

export type SubmissionRow = {
  lesson_slug: string;
  exercise_id: string;
};

export function submissionKey(lessonSlug: string, exerciseId: string) {
  return `${lessonSlug}:${exerciseId}`;
}

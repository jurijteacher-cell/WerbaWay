import { createClient } from '@/lib/supabase/server';
import type { SavedSubmission, SubmissionRow } from '@/lib/submission-types';
import { submissionKey } from '@/lib/submission-types';

export type { SavedSubmission, SubmissionRow } from '@/lib/submission-types';
export { submissionKey } from '@/lib/submission-types';

export async function getSubmissionsForLessons(
  userId: string,
  lessonSlugs: string[]
): Promise<Map<string, SavedSubmission>> {
  if (lessonSlugs.length === 0) return new Map();

  const supabase = createClient();
  const { data } = await supabase
    .from('submissions')
    .select(
      'lesson_slug, exercise_id, answer, is_correct, auto_graded, teacher_feedback, submitted_at, graded_at'
    )
    .eq('student_id', userId)
    .in('lesson_slug', lessonSlugs);

  const map = new Map<string, SavedSubmission>();
  for (const row of data ?? []) {
    map.set(submissionKey(row.lesson_slug, row.exercise_id), {
      exerciseId: row.exercise_id,
      lessonSlug: row.lesson_slug,
      answer: row.answer,
      isCorrect: row.is_correct,
      autoGraded: row.auto_graded,
      teacherFeedback: row.teacher_feedback,
      submittedAt: row.submitted_at,
      gradedAt: row.graded_at,
    });
  }
  return map;
}

export async function getSubmissionRowsForUser(userId: string): Promise<SubmissionRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('submissions')
    .select('lesson_slug, exercise_id')
    .eq('student_id', userId);
  return data ?? [];
}

export function countDoneForLesson(lessonSlug: string, rows: SubmissionRow[]) {
  return rows.filter((r) => r.lesson_slug === lessonSlug).length;
}

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getLessonBySlug } from '@/content/lessons';
import { evaluateExercise } from '@/lib/evaluate-exercise';

export async function overrideAnswer(
  lessonSlug: string,
  exerciseId: string,
  studentId: string,
  answer: unknown,
  revalidate?: string
) {
  const lesson = getLessonBySlug(lessonSlug);
  const exercise = lesson?.exercises.find((e) => e.id === exerciseId);
  if (!lesson || !exercise) {
    return { ok: false as const, error: 'Урок або вправу не знайдено' };
  }

  const evaluation = await evaluateExercise(exercise, answer);
  let { isCorrect, autoGraded, feedback } = evaluation;

  if (exercise.type === 'open_text' && isCorrect === null) {
    isCorrect = true;
    autoGraded = false;
    feedback = undefined;
  }

  const supabase = createClient();

  const { error } = await supabase.from('submissions').upsert(
    {
      student_id: studentId,
      lesson_slug: lessonSlug,
      exercise_id: exerciseId,
      exercise_type: exercise.type,
      answer,
      is_correct: isCorrect,
      auto_graded: autoGraded,
      teacher_feedback: feedback ?? null,
      edited_by_teacher: true,
      submitted_at: new Date().toISOString(),
      graded_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_slug,exercise_id' }
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (revalidate) revalidatePath(revalidate);
  return { ok: true as const, isCorrect };
}

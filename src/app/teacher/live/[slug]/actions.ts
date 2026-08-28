'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getLessonBySlug } from '@/content/lessons';
import { grade } from '@/lib/grading';

export async function overrideAnswer(
  lessonSlug: string,
  exerciseId: string,
  studentId: string,
  answer: unknown
) {
  const lesson = getLessonBySlug(lessonSlug);
  const exercise = lesson?.exercises.find((e) => e.id === exerciseId);
  if (!lesson || !exercise) {
    return { ok: false as const, error: 'Урок або вправу не знайдено' };
  }

  const isCorrect = grade(exercise, answer);
  const autoGraded = isCorrect !== null;
  const supabase = createClient();

  // RLS дозволяє UPDATE/INSERT чужого student_id лише якщо профіль поточного
  // користувача має role='teacher' (див. is_teacher() у 0001_init.sql).
  const { error } = await supabase.from('submissions').upsert(
    {
      student_id: studentId,
      lesson_slug: lessonSlug,
      exercise_id: exerciseId,
      exercise_type: exercise.type,
      answer,
      is_correct: isCorrect,
      auto_graded: autoGraded,
      edited_by_teacher: true,
      submitted_at: new Date().toISOString(),
      graded_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_slug,exercise_id' }
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/teacher/live/${lessonSlug}`);
  return { ok: true as const, isCorrect };
}

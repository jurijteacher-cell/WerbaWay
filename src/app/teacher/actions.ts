'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function gradeSubmission(submissionId: string, isCorrect: boolean, feedback: string) {
  const supabase = createClient();

  // RLS дозволяє UPDATE лише якщо профіль поточного користувача має role = 'teacher'
  // (див. supabase/migrations/0001_init.sql, функція is_teacher()).
  const { error } = await supabase
    .from('submissions')
    .update({
      is_correct: isCorrect,
      teacher_feedback: feedback || null,
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath('/teacher');
  return { ok: true as const };
}

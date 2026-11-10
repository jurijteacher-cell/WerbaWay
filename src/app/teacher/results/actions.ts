'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function setArchived(studentId: string, archived: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from('embed_students')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', studentId);
  revalidatePath('/teacher/results');
  revalidatePath(`/teacher/results/${studentId}`);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function deleteAttempts(studentId: string, lessonId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('embed_attempts')
    .delete()
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId);
  revalidatePath(`/teacher/results/${studentId}`);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

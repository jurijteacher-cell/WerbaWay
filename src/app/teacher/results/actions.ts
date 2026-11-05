'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { makeCode } from '@/lib/student-code';

export async function createStudent(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim().slice(0, 80);
  const note = String(formData.get('note') ?? '').trim().slice(0, 200) || null;
  if (!name) return { ok: false as const, error: 'Вкажіть ім’я' };

  const supabase = createClient();
  for (let i = 0; i < 6; i++) {
    const code = makeCode(name);
    const { error } = await supabase.from('embed_students').insert({ name, note, code });
    if (!error) {
      revalidatePath('/teacher/results');
      return { ok: true as const, code };
    }
    if (error.code !== '23505') return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: 'Не вдалося підібрати вільний код, спробуйте ще раз' };
}

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

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function assignLecture(lectureSlug: string, studentId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Потрібна авторизація' };

  // RLS дозволяє insert лише role='teacher' (0003_lectures.sql)
  const { error } = await supabase
    .from('assignments')
    .insert({ lecture_slug: lectureSlug, student_id: studentId, assigned_by: user.id });

  if (error) {
    // унікальний індекс (lecture_slug, student_id) — вже призначено, це не помилка
    if (error.code === '23505') return { ok: true as const };
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/teacher/live/lectures/${lectureSlug}`);
  return { ok: true as const };
}

export async function unassignLecture(lectureSlug: string, studentId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('lecture_slug', lectureSlug)
    .eq('student_id', studentId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teacher/live/lectures/${lectureSlug}`);
  return { ok: true as const };
}

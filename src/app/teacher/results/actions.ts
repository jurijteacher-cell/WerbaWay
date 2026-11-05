'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const TRANSLIT: Record<string, string> = {
  а: 'A', б: 'B', в: 'V', г: 'H', ґ: 'G', д: 'D', е: 'E', є: 'E', ж: 'Z', з: 'Z', и: 'Y', і: 'I',
  ї: 'I', й: 'J', к: 'K', л: 'L', м: 'M', н: 'N', о: 'O', п: 'P', р: 'R', с: 'S', т: 'T', у: 'U',
  ф: 'F', х: 'H', ц: 'C', ч: 'C', ш: 'S', щ: 'S', ь: '', ю: 'U', я: 'A', ы: 'Y', э: 'E', ё: 'E',
  ъ: '', ą: 'A', ć: 'C', ę: 'E', ł: 'L', ń: 'N', ó: 'O', ś: 'S', ź: 'Z', ż: 'Z',
};

function codeBase(name: string) {
  const ascii = name
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return (ascii || 'UCZEN').slice(0, 5);
}

function makeCode(name: string) {
  // 2 digits without 0/1 so the code isn't confused with O/I
  const digits = '23456789';
  const d = () => digits[Math.floor(Math.random() * digits.length)];
  return `${codeBase(name)}${d()}${d()}`;
}

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

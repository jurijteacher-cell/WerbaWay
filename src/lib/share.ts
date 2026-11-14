import { createClient } from '@/lib/supabase/server';

const TOKEN_RE = /^[A-Za-z0-9_-]{8,40}$/;

/** Лекція за публічним токеном (lecture_shares; гість читає лише через функцію open_lecture_share) */
export async function sharedSlug(token: string, count = false): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await createClient().rpc('open_lecture_share', { p_token: token, p_count: count });
  return error ? null : ((data as string | null) ?? null);
}

/**
 * Залогінений відкрив посилання: лекція додається йому в курс (student_access, kind=lesson),
 * щоб далі він читав її на /learn/<slug> — з прогресом, домашкою й результатами вправ на акаунті.
 * Викладачеві доступ не потрібен, тож функція лише повертає slug. Повертає null, якщо
 * посилання немає, його відкликали, користувач не ввійшов — або міграції 0016 ще немає в базі
 * (тоді сторінка просто показує лекцію як гостю, замість того щоб падати).
 */
export async function claimSharedLesson(token: string, lessonModule?: string): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await createClient().rpc('claim_lecture_share', {
    p_token: token,
    p_module: lessonModule ?? null,
  });
  return error ? null : ((data as string | null) ?? null);
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { dayKey, fetchAttempts, pct, type AttemptRow } from '@/lib/analytics';

/**
 * Учні для викладача.
 * Джерела: embed_student_stats (усі, хто робив вправи — і з акаунтом на сайті, і лише з Notion),
 * profiles (акаунти), lesson_progress (лекції, пройдені в класі + домашка), vocab_progress (слова), student_access.
 * Відповіді у вправах (embed_attempts.student_id) прив'язані до embed-учня, а не до акаунта.
 */

export type StudentRow = {
  /** id для посилань: акаунт (profiles.id) або, якщо акаунта нема, embed-учень */
  key: string;
  name: string;
  userId: string | null;
  embedIds: string[];
  hasAccount: boolean;
  attempts: number;
  accuracy: number | null;
  firstTotal: number;
  lastAt: string | null;
  lecturesDone: number;
  lecturesTouched: number;
  homeworkTodo: number;
  homeworkDone: number;
  wordsKnown: number;
  courses: number;
  /** останні 14 днів, найстаріший перший */
  spark: number[];
  activeDays7: number;
};

const DAY = 24 * 3600 * 1000;

function lastNDays(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getTime() - (n - 1 - i) * DAY)));
}

export async function loadStudents(supabase: SupabaseClient): Promise<{ rows: StudentRow[]; attempts: AttemptRow[] }> {
  const [{ data: stats }, { data: profiles }, attempts, { data: progress }, { data: vocab }, { data: access }] = await Promise.all([
    supabase.from('embed_student_stats').select('id, name, user_id, archived_at'),
    supabase.from('profiles').select('id, full_name, role'),
    fetchAttempts(supabase),
    supabase.from('lesson_progress').select('student_id, lesson_slug, completed_at, homework_assigned_at, homework_done_at'),
    supabase.from('vocab_progress').select('student_id, known'),
    supabase.from('student_access').select('student_id, kind'),
  ]);

  const teacherIds = new Set((profiles ?? []).filter((p) => p.role === 'teacher').map((p) => p.id as string));
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  // учень = акаунт (усі його embed-записи разом) або окремий embed-запис без акаунта
  const byKey = new Map<string, { name: string; userId: string | null; embedIds: string[] }>();
  for (const s of stats ?? []) {
    if (s.archived_at) continue;
    const uid = (s.user_id as string | null) ?? null;
    if (uid && teacherIds.has(uid)) continue;
    const key = uid ?? (s.id as string);
    const cur = byKey.get(key) ?? {
      name: (uid && (profileById.get(uid)?.full_name as string)) || (s.name as string) || 'Учень',
      userId: uid,
      embedIds: [],
    };
    cur.embedIds.push(s.id as string);
    byKey.set(key, cur);
  }
  // акаунти учнів, які ще не робили вправ
  for (const p of profiles ?? []) {
    if (p.role === 'teacher' || byKey.has(p.id as string)) continue;
    byKey.set(p.id as string, { name: (p.full_name as string) || 'Учень', userId: p.id as string, embedIds: [] });
  }

  const attemptsByEmbed = new Map<string, AttemptRow[]>();
  for (const a of attempts) attemptsByEmbed.set(a.student_id, [...(attemptsByEmbed.get(a.student_id) ?? []), a]);

  const days14 = lastNDays(14);
  const days7 = new Set(lastNDays(7));
  const rows: StudentRow[] = [];
  for (const [key, s] of byKey) {
    const mine = s.embedIds.flatMap((id) => attemptsByEmbed.get(id) ?? []);
    const first = mine.filter((a) => a.attempt_no === 1 && a.is_correct != null);
    const ok = first.filter((a) => a.is_correct).length;
    const prog = s.userId ? (progress ?? []).filter((p) => p.student_id === s.userId) : [];
    const perDay = new Map<string, number>();
    for (const a of mine) perDay.set(dayKey(a.created_at), (perDay.get(dayKey(a.created_at)) ?? 0) + 1);
    for (const p of prog) perDay.set(dayKey(p.completed_at as string), (perDay.get(dayKey(p.completed_at as string)) ?? 0) + 1);
    const lastAttempt = mine.reduce<string | null>((m, a) => (!m || a.created_at > m ? a.created_at : m), null);
    const lastLesson = prog.reduce<string | null>((m, p) => (!m || (p.completed_at as string) > m ? (p.completed_at as string) : m), null);
    rows.push({
      key,
      name: s.name,
      userId: s.userId,
      embedIds: s.embedIds,
      hasAccount: !!s.userId,
      attempts: mine.length,
      accuracy: pct(ok, first.length),
      firstTotal: first.length,
      lastAt: [lastAttempt, lastLesson].filter(Boolean).sort().pop() ?? null,
      lecturesDone: prog.length,
      lecturesTouched: new Set(mine.map((a) => a.lesson_id)).size,
      homeworkTodo: prog.filter((p) => p.homework_assigned_at && !p.homework_done_at).length,
      homeworkDone: prog.filter((p) => p.homework_done_at).length,
      wordsKnown: s.userId ? (vocab ?? []).filter((v) => v.student_id === s.userId && v.known).length : 0,
      courses: s.userId ? (access ?? []).filter((a) => a.student_id === s.userId && a.kind === 'module').length : 0,
      spark: days14.map((d) => perDay.get(d) ?? 0),
      activeDays7: [...perDay.keys()].filter((d) => days7.has(d)).length,
    });
  }
  rows.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? '') || a.name.localeCompare(b.name, 'uk'));
  return { rows, attempts };
}

/** пастельний колір аватарки зі сталого хешу імені */
const AVATAR = ['#ffe168', '#a9dcc6', '#bcdcf2', '#f6c2af', '#d8cff0', '#f3d9a4'];
export function avatarColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function relDay(iso: string | null, now = new Date()) {
  if (!iso) return 'ще не займався';
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return 'сьогодні';
  if (d === 1) return 'вчора';
  if (d < 7) return `${d} дн. тому`;
  if (d < 30) return `${Math.floor(d / 7)} тиж. тому`;
  return `${Math.floor(d / 30)} міс. тому`;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { lessonTitle } from '@/lib/lesson-titles';

export type AttemptRow = {
  student_id: string;
  lesson_id: string;
  embed: string;
  item_id: string;
  grammar_point: string | null;
  is_correct: boolean | null;
  attempt_no: number;
  created_at: string;
};

export type MockRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  exam_label: string | null;
  total: number;
  max_total: number;
  level: string | null;
  passed: boolean | null;
  minutes: number | null;
  score: { weak?: string[] } | null;
  created_at: string;
};

const COLS = 'student_id, lesson_id, embed, item_id, grammar_point, is_correct, attempt_no, created_at';
const PAGE = 1000;

/** PostgREST returns at most 1000 rows per request — page until done (capped). */
export async function fetchAttempts(
  supabase: SupabaseClient,
  opts: { sinceIso?: string; studentId?: string; cap?: number } = {}
): Promise<AttemptRow[]> {
  const cap = opts.cap ?? 20000;
  const out: AttemptRow[] = [];
  for (let from = 0; from < cap; from += PAGE) {
    let q = supabase.from('embed_attempts').select(COLS).order('created_at', { ascending: true }).range(from, from + PAGE - 1);
    if (opts.sinceIso) q = q.gte('created_at', opts.sinceIso);
    if (opts.studentId) q = q.eq('student_id', opts.studentId);
    const { data, error } = await q;
    if (error || !data) break;
    out.push(...(data as AttemptRow[]));
    if (data.length < PAGE) break;
  }
  return out;
}

const TZ = 'Europe/Warsaw';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayKey = (d: Date | string) => dayFmt.format(typeof d === 'string' ? new Date(d) : d);

export const pct = (ok: number, total: number) => (total ? Math.round((ok / total) * 100) : null);

export type Summary = {
  attempts: number;
  firstTotal: number;
  firstOk: number;
  accuracy: number | null;
  exercises: number;
  lessons: number;
  openAnswers: number;
  activeDays: number;
  streak: number;
  lastAt: string | null;
  /** last 28 days, oldest first */
  daily: { date: string; n: number }[];
  /** grammar points with ≥3 first attempts, weakest first */
  weak: { point: string; ok: number; total: number; pct: number }[];
  byEmbed: { embed: string; ok: number; total: number; pct: number | null; attempts: number }[];
  recentLessons: { lessonId: string; title: string; attempts: number; ok: number; total: number; pct: number | null; lastAt: string }[];
};

export function summarize(rows: AttemptRow[], now = new Date()): Summary {
  const days = new Map<string, number>();
  const points = new Map<string, { ok: number; total: number }>();
  const embeds = new Map<string, { ok: number; total: number; attempts: number }>();
  const lessons = new Map<string, { attempts: number; ok: number; total: number; lastAt: string }>();
  const items = new Set<string>();
  let firstTotal = 0;
  let firstOk = 0;
  let open = 0;
  let lastAt: string | null = null;

  for (const r of rows) {
    days.set(dayKey(r.created_at), (days.get(dayKey(r.created_at)) ?? 0) + 1);
    items.add(`${r.lesson_id}|${r.embed}|${r.item_id}`);
    if (!lastAt || r.created_at > lastAt) lastAt = r.created_at;
    if (r.is_correct == null) open++;
    const first = r.attempt_no === 1 && r.is_correct != null;

    const E = embeds.get(r.embed) ?? { ok: 0, total: 0, attempts: 0 };
    E.attempts++;
    const L = lessons.get(r.lesson_id) ?? { attempts: 0, ok: 0, total: 0, lastAt: r.created_at };
    L.attempts++;
    if (r.created_at > L.lastAt) L.lastAt = r.created_at;
    if (first) {
      firstTotal++;
      if (r.is_correct) firstOk++;
      E.total++;
      L.total++;
      if (r.is_correct) {
        E.ok++;
        L.ok++;
      }
      if (r.grammar_point) {
        const P = points.get(r.grammar_point) ?? { ok: 0, total: 0 };
        P.total++;
        if (r.is_correct) P.ok++;
        points.set(r.grammar_point, P);
      }
    }
    embeds.set(r.embed, E);
    lessons.set(r.lesson_id, L);
  }

  // streak: consecutive active days ending today (or yesterday)
  let streak = 0;
  const cur = new Date(now);
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(dayKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  const daily: Summary['daily'] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    daily.push({ date: k, n: days.get(k) ?? 0 });
  }

  return {
    attempts: rows.length,
    firstTotal,
    firstOk,
    accuracy: pct(firstOk, firstTotal),
    exercises: items.size,
    lessons: lessons.size,
    openAnswers: open,
    activeDays: days.size,
    streak,
    lastAt,
    daily,
    weak: [...points.entries()]
      .filter(([, v]) => v.total >= 3)
      .map(([point, v]) => ({ point, ...v, pct: Math.round((v.ok / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct || b.total - a.total)
      .slice(0, 8),
    byEmbed: [...embeds.entries()]
      .map(([embed, v]) => ({ embed, ...v, pct: pct(v.ok, v.total) }))
      .sort((a, b) => b.attempts - a.attempts),
    recentLessons: [...lessons.entries()]
      .map(([lessonId, v]) => ({ lessonId, title: lessonTitle(lessonId), ...v, pct: pct(v.ok, v.total) }))
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
      .slice(0, 8),
  };
}

export const EMBED_LABEL: Record<string, string> = {
  grammar: 'Граматика',
  'grammar-board': 'Дошка',
  hw: 'Домашка',
  exam: 'Egzamin',
  'mock-exam': 'Пробний іспит',
};

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function pctClass(p: number | null) {
  if (p == null) return 'text-paper-muted';
  return p >= 80 ? 'text-correct' : p >= 60 ? 'text-gold' : 'text-incorrect';
}

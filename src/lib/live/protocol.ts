/**
 * «Дивитися учня» — викладач бачить, що учень обирає й вписує у вправах; гортає лекцію сам.
 * Екран учня НЕ передається (раніше йшов запис rrweb — це з'їдало квоту egress Supabase).
 *
 *   учень (LiveBeacon) ──Realtime: присутність + стан вправ (`st`)──▶ викладач (LiveWatch)
 *   викладач ──`need-st` (дай повний стан вікна)──▶ учень
 *
 * Стан вправ — це те, що вправи й так пишуть у localStorage учня (lib/embed-progress.ts);
 * маячок ловить подію `storage` і шле лише змінене, кілобайти замість знімків сторінки.
 * Канал приватний `class:<uid учня>`: його бачить лише викладач і сам учень
 * (політики RLS — supabase/migrations/0010_class.sql). Стан шлеться, тільки поки викладач
 * дивиться і учень у лекції (/learn/…).
 */

export const classTopic = (studentId: string) => `class:${studentId}`;

/** Канал гостя за публічним посиланням: id — кука ww_vid (uuid), а не акаунт (0016_guests.sql) */
export const guestTopic = (visitorId: string) => `guest:${visitorId}`;

/** Realtime broadcast event name for every message */
export const CLASS_EVENT = 'c';

/**
 * Повідомлення на каналі.
 *  `st` — стан вправ учня: `key` = liveKey(адреса вікна вправи), `s` = scope → збережений стан
 *        (null — скинуто). `full: true` — повний набір для цього key (замінити), інакше — оновлення.
 *  `need-st` — викладач просить повний стан вікна `key`; `to` — у якої вкладки (без `to` — у всіх).
 */
export type ClassMsg =
  | { k: 'st'; key: string; s: Record<string, unknown>; full?: boolean }
  | { k: 'need-st'; key: string; to?: string };

/** Ідентичність вікна вправи, однакова в учня й викладача: pathname + відсортовані параметри без службових. */
const LIVE_SKIP_PARAMS = new Set(['s', 'lang', 'ww_watch']);
export function liveKey(href: string): string {
  try {
    const u = new URL(href, 'http://x');
    // іспит-лекція: усі частини (?part=) ділять один стан, тож ключ без part
    const skipPart = u.pathname.endsWith('/mock-exam');
    const q = [...u.searchParams.entries()].filter(([k]) => !LIVE_SKIP_PARAMS.has(k) && !(skipPart && k === 'part')).sort(([a], [b]) => a.localeCompare(b));
    return u.pathname + (q.length ? `?${q.map(([k, v]) => `${k}=${v}`).join('&')}` : '');
  } catch {
    return href;
  }
}

/**
 * Присутність на каналі.
 *  учень: mode `site` — десь на сайті, `lesson` — у лекції (path = /learn/…, title — назва лекції);
 *         `tab` — id вкладки, `vis` — вкладка зараз перед очима (не схована за іншою);
 *         `pg` — індекс сторінки лекції (з 0), на якій учень;
 *  викладач: mode `watch` — зараз дивиться екран учня (лише тоді учень пише запис);
 *         `watch` — яку саме вкладку учня (пише лише вона; без `watch` — старий клієнт, пишуть усі).
 */
export type Presence = {
  role: 'student' | 'teacher';
  name?: string;
  mode?: 'site' | 'lesson' | 'watch';
  path?: string;
  title?: string;
  tab?: string;
  vis?: boolean;
  pg?: number;
  watch?: string;
  at: number;
};

/** Сторінки, які викладач може дивитися: лекція і її домашка — свої (/learn) і за посиланням (/s) */
const LEARN_PATH = /^\/learn\/[a-z0-9][a-z0-9-]*(\/hw)?\/?$/;
const SHARED_PATH = /^\/s\/[A-Za-z0-9_-]{8,40}(\/hw)?\/?$/;
export const isLessonPath = (p: string | null | undefined) => !!p && (LEARN_PATH.test(p) || SHARED_PATH.test(p));

/** slug лекції з шляху /learn/<slug>[/hw]; у гостя в шляху токен, а не slug — тоді null */
export const lessonSlugOf = (p: string | null | undefined) => (p && /^\/learn\/([a-z0-9][a-z0-9-]*)/.exec(p)?.[1]) || null;

/**
 * Із кількох вкладок учня беремо ту, що в лекції; серед них — ту, що перед очима (vis),
 * потім найсвіжішу. Так викладач бачить саме те вікно, на яке учень зараз дивиться.
 */
export function pickStudent(all: Presence[]): Presence | null {
  const stu = all.filter((p) => p.role === 'student');
  if (!stu.length) return null;
  const rank = (p: Presence) => (p.vis === false ? 0 : 1);
  const newest = (a: Presence, b: Presence) => rank(b) - rank(a) || b.at - a.at;
  const inLesson = stu.filter((p) => p.mode === 'lesson').sort(newest);
  return inLesson[0] ?? [...stu].sort(newest)[0];
}

/* ── chunking: a Realtime message is capped (256 KB on the free plan), a snapshot can be bigger ── */

const CHUNK = 90_000;

export type Chunk = { id: string; i: number; n: number; s: string };

export function toChunks(msg: ClassMsg): Chunk[] {
  const json = JSON.stringify(msg);
  const id = Math.random().toString(36).slice(2, 10);
  const n = Math.max(1, Math.ceil(json.length / CHUNK));
  return Array.from({ length: n }, (_, i) => ({ id, i, n, s: json.slice(i * CHUNK, (i + 1) * CHUNK) }));
}

/** Puts chunks back together (they arrive in order; incomplete groups are dropped after 30 s). */
export class ChunkAssembler {
  private parts = new Map<string, { got: string[]; n: number; at: number }>();

  push(c: Chunk): ClassMsg | null {
    if (!c || typeof c.id !== 'string' || typeof c.s !== 'string') return null;
    if (c.n === 1) return parse(c.s);
    const now = Date.now();
    for (const [k, v] of this.parts) if (now - v.at > 30_000) this.parts.delete(k);
    const cur = this.parts.get(c.id) ?? { got: [], n: c.n, at: now };
    cur.got[c.i] = c.s;
    this.parts.set(c.id, cur);
    if (cur.got.filter((x) => x !== undefined).length < cur.n) return null;
    this.parts.delete(c.id);
    return parse(cur.got.join(''));
  }
}

function parse(json: string): ClassMsg | null {
  try {
    const m = JSON.parse(json);
    return m && typeof m.k === 'string' ? (m as ClassMsg) : null;
  } catch {
    return null;
  }
}

/**
 * «Дивитися учня» — викладач бачить екран учня наживо, лише дивиться (нічого не натискає за нього).
 *
 *   учень на сайті (LiveBeacon) ──Realtime: присутність + запис rrweb──▶ викладач (LiveWatch)
 *   викладач ──`need-snap` (дай свіжий знімок)──▶ учень
 *
 * Канал приватний `class:<uid учня>` (назва лишилась від колишнього «Класу», політики RLS —
 * supabase/migrations/0010_class.sql): його бачить лише викладач і сам учень.
 * Запис екрана йде, тільки поки викладач дивиться і учень у лекції (/learn/…).
 */

export const classTopic = (studentId: string) => `class:${studentId}`;

/** Канал гостя за публічним посиланням: id — кука ww_vid (uuid), а не акаунт (0016_guests.sql) */
export const guestTopic = (visitorId: string) => `guest:${visitorId}`;

/** Realtime broadcast event name for every message */
export const CLASS_EVENT = 'c';

/** Messages on the channel. `rr` = batch of rrweb events (packed strings) student → teacher.
 *  `n` — номер пакета за порядком: якщо у викладача розрив, він просить свіжий знімок екрана. */
export type ClassMsg = { k: 'rr'; d: string[]; n?: number } | { k: 'need-snap' } | ViewAnchor;

/**
 * `vp` — що в учня посередині екрана: id вузла з запису rrweb і де саме в ньому (0…1 по висоті).
 * Прокрутка rrweb іде в пікселях учня, а в режимі «Мій екран» кадр розкладений під ширину
 * викладача — ті самі пікселі там показують інше місце. За якорем кадр викладача
 * прокручується до того самого фрагмента лекції.
 */
export type ViewAnchor = { k: 'vp'; id: number; r: number };

/**
 * Присутність на каналі.
 *  учень: mode `site` — десь на сайті, `lesson` — у лекції (path = /learn/…, title — назва лекції);
 *  викладач: mode `watch` — зараз дивиться екран учня (лише тоді учень пише запис).
 */
export type Presence = {
  role: 'student' | 'teacher';
  name?: string;
  mode?: 'site' | 'lesson' | 'watch';
  path?: string;
  title?: string;
  at: number;
};

/** Сторінки, які викладач може дивитися: лекція і її домашка — свої (/learn) і за посиланням (/s) */
const LEARN_PATH = /^\/learn\/[a-z0-9][a-z0-9-]*(\/hw)?\/?$/;
const SHARED_PATH = /^\/s\/[A-Za-z0-9_-]{8,40}(\/hw)?\/?$/;
export const isLessonPath = (p: string | null | undefined) => !!p && (LEARN_PATH.test(p) || SHARED_PATH.test(p));

/** slug лекції з шляху /learn/<slug>[/hw]; у гостя в шляху токен, а не slug — тоді null */
export const lessonSlugOf = (p: string | null | undefined) => (p && /^\/learn\/([a-z0-9][a-z0-9-]*)/.exec(p)?.[1]) || null;

/** Із кількох вкладок учня беремо ту, що в лекції, потім найсвіжішу */
export function pickStudent(all: Presence[]): Presence | null {
  const stu = all.filter((p) => p.role === 'student');
  if (!stu.length) return null;
  const inLesson = stu.filter((p) => p.mode === 'lesson').sort((a, b) => b.at - a.at);
  return inLesson[0] ?? [...stu].sort((a, b) => b.at - a.at)[0];
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

/**
 * «Клас» — живе заняття: протокол між учнем, його iframe-вправою та викладачем.
 *
 *   iframe (embed/slides, ClassAgent) ──postMessage──▶ сторінка учня (/class)
 *   сторінка учня ──Realtime broadcast `c` на каналі class:<uid>──▶ сторінка викладача
 *   викладач ──те саме в зворотний бік (команди)──▶ учень ──postMessage──▶ iframe
 *
 * Канал приватний: його бачить лише викладач і сам учень (див. supabase/migrations/0010_class.sql).
 */

export const classTopic = (studentId: string) => `class:${studentId}`;

/** Realtime broadcast event name for every class message */
export const CLASS_EVENT = 'c';

/** Tag on postMessage envelopes between a class iframe and its parent page */
export const FRAME_TAG = 'ww-class';

export type RoomState = {
  active: boolean;
  lesson_id: string | null;
  embed: string | null;
  blocks: string | null;
};

export const EMPTY_ROOM: RoomState = { active: false, lesson_id: null, embed: null, blocks: null };

/** What can be opened in class. `slides` lives outside /embed. */
export const CLASS_EMBEDS: { id: string; label: string }[] = [
  { id: 'slides', label: 'Слайди (граматика)' },
  { id: 'grammar', label: 'Граматика — вправи' },
  { id: 'vocab', label: 'Слова — картки' },
  { id: 'comm-tasks', label: 'Комунікативні завдання' },
  { id: 'hw', label: 'Домашнє завдання' },
  { id: 'exam', label: 'Іспитові блоки' },
];

/** iframe src for a room, or null when the room is closed or incomplete */
export function roomUrl(r: RoomState | null | undefined): string | null {
  if (!r?.active || !r.lesson_id || !r.embed) return null;
  const id = encodeURIComponent(r.lesson_id);
  if (r.embed === 'slides') return `/slides/${id}?class=1`;
  const blocks = r.blocks ? `&blocks=${encodeURIComponent(r.blocks)}` : '';
  return `/embed/${id}/${encodeURIComponent(r.embed)}?class=1${blocks}`;
}

/** Messages on the channel. `rr` = batch of rrweb events (packed strings) student → teacher. */
export type ClassMsg =
  | { k: 'rr'; d: string[] }
  | { k: 'need-snap' }
  | { k: 'room'; room: RoomState }
  | { k: 'click'; id: number };

export type Presence = { role: 'student' | 'teacher'; name?: string; mode?: 'lobby' | 'class'; at: number };

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

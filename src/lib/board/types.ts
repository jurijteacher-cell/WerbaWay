/**
 * Дошка викладача (docs/CLASS_TOOLS_SPEC.md §3): одна на всіх; стікери й текст.
 * Зберігається в teacher_board (els/vp/rev); живі зміни йдуть каналом `board:main` (пише лише викладач).
 */

export type NoteColor = 'violet' | 'sky' | 'pink' | 'mint' | 'lemon';
export const NOTE_COLORS: NoteColor[] = ['violet', 'sky', 'pink', 'mint', 'lemon'];

export type FontSize = 'S' | 'M' | 'L' | 'XL';
/** px: не менше 16, щоб iOS Safari не зумив сторінку на фокусі поля */
export const FS_PX: Record<FontSize, number> = { S: 16, M: 20, L: 28, XL: 40 };

export type BoardEl =
  | { id: string; t: 'note'; x: number; y: number; w: number; h: number; c: NoteColor; text: string; fs: FontSize; z: number }
  | { id: string; t: 'text'; x: number; y: number; w: number; text: string; fs: FontSize; z: number };

export type Viewport = { x: number; y: number; zoom: number };

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;
export const MAX_ELS = 300;
export const MAX_TEXT = 500;
export const HISTORY = 50;

export const boardTopic = 'board:main';
export const BOARD_EVENT = 'b';

export type BoardOp = { u: BoardEl } | { d: string };

/** Повідомлення каналу board:main */
export type BoardMsg =
  | { k: 'bd-ops'; rev: number; ops: BoardOp[] }
  | { k: 'bd-vp'; vp: Viewport }
  | { k: 'bd-follow'; follow: boolean }
  | { k: 'bd-full'; rev: number }
  | { k: 'bd-kick'; uid: string };

/** Присутність глядача на board:main */
export type BoardPresence = { uid: string; name?: string; at: number };

export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const elH = (e: BoardEl) => (e.t === 'note' ? e.h : Math.max(32, FS_PX[e.fs] * 1.4 * Math.max(1, e.text.split('\n').length)));

/** Що змінилось між двома наборами: нові/змінені → {u}, зниклі → {d} (порівняння за посиланням) */
export function diffOps(prev: BoardEl[], next: BoardEl[]): BoardOp[] {
  const before = new Map(prev.map((e) => [e.id, e]));
  const ops: BoardOp[] = [];
  const seen = new Set<string>();
  for (const e of next) {
    seen.add(e.id);
    if (before.get(e.id) !== e) ops.push({ u: e });
  }
  for (const e of prev) if (!seen.has(e.id)) ops.push({ d: e.id });
  return ops;
}

export function applyOps(els: BoardEl[], ops: BoardOp[]): BoardEl[] {
  const map = new Map(els.map((e) => [e.id, e]));
  for (const op of ops) {
    if ('u' in op) map.set(op.u.id, op.u);
    else map.delete(op.d);
  }
  return [...map.values()];
}

/** В'юпорт, що вміщає всі елементи в вікно w×h з відступом */
export function fitViewport(els: BoardEl[], w: number, h: number): Viewport {
  if (!els.length || w <= 0 || h <= 0) return { x: 0, y: 0, zoom: 1 };
  const x0 = Math.min(...els.map((e) => e.x));
  const y0 = Math.min(...els.map((e) => e.y));
  const x1 = Math.max(...els.map((e) => e.x + e.w));
  const y1 = Math.max(...els.map((e) => e.y + elH(e)));
  const pad = 48;
  const zoom = clampZoom(Math.min((w - pad * 2) / Math.max(1, x1 - x0), (h - pad * 2) / Math.max(1, y1 - y0), 1.25));
  return { zoom, x: (w - (x1 - x0) * zoom) / 2 - x0 * zoom, y: (h - (y1 - y0) * zoom) / 2 - y0 * zoom };
}

/** Захист від сміття з БД/каналу */
export function sanitizeEls(raw: unknown): BoardEl[] {
  if (!Array.isArray(raw)) return [];
  const out: BoardEl[] = [];
  for (const e of raw.slice(0, MAX_ELS)) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.x !== 'number' || typeof o.y !== 'number' || typeof o.w !== 'number') continue;
    const fs = (['S', 'M', 'L', 'XL'] as const).includes(o.fs as FontSize) ? (o.fs as FontSize) : 'M';
    const text = typeof o.text === 'string' ? o.text.slice(0, MAX_TEXT) : '';
    const z = typeof o.z === 'number' ? o.z : 0;
    if (o.t === 'note' && typeof o.h === 'number') {
      const c = NOTE_COLORS.includes(o.c as NoteColor) ? (o.c as NoteColor) : 'violet';
      out.push({ id: o.id, t: 'note', x: o.x, y: o.y, w: o.w, h: o.h, c, text, fs, z });
    } else if (o.t === 'text') out.push({ id: o.id, t: 'text', x: o.x, y: o.y, w: o.w, text, fs, z });
  }
  return out;
}

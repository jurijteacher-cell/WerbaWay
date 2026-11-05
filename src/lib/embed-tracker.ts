'use client';

/**
 * Records every «Sprawdź» in Notion embeds to Supabase under the student's code.
 *
 * Code source, in order: `?s=CODE` in the embed URL → localStorage (shared by all
 * embeds of one Notion page in one browser) → nothing yet. Attempts made before
 * the code is entered wait in memory and are sent once it is entered.
 *
 * Teacher mode (code `NAUCZYCIEL`): nothing is recorded in that browser —
 * for the teacher clicking through exercises on a screen share.
 */

export type AttemptInput = {
  embed?: string;
  blockId?: string | number | null;
  itemId: string | number;
  itemType?: string | null;
  grammarPoint?: string | null;
  prompt?: string | null;
  answer?: string | null;
  expected?: string | null;
  correct?: boolean | null;
};

type Payload = AttemptInput & { lessonId: string; embed: string };

export type TrackerState = {
  status: 'none' | 'student' | 'teacher';
  code: string | null;
  name: string | null;
  pending: number;
  error: string | null;
};

/**
 * Master switch (migration 0005 applied in Supabase 2026-11-05). Turning it off hides
 * the code bar and stops recording.
 */
export const EMBED_RESULTS_ENABLED = true;

const LS_CODE = 'ww_student_code';
const LS_NAME = 'ww_student_name';
export const TEACHER_CODE = 'NAUCZYCIEL';

let state: TrackerState = { status: 'none', code: null, name: null, pending: 0, error: null };
let queue: Payload[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function emit(patch: Partial<TrackerState>) {
  state = { ...state, ...patch, pending: queue.length };
  listeners.forEach((l) => l());
}

function lsGet(k: string) {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string | null) {
  try {
    if (v == null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, v);
  } catch {
    /* storage blocked — keep in memory only */
  }
}

export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** `/embed/{lessonId}/{embed}` → ids, or null outside embeds */
function context(): { lessonId: string; embed: string } | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/embed\/([^/]+)\/([^/?#]+)/);
  return m ? { lessonId: decodeURIComponent(m[1]), embed: m[2] } : null;
}

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const fromUrl = normalizeCode(new URLSearchParams(window.location.search).get('s') ?? '');
  const stored = lsGet(LS_CODE);
  const code = fromUrl || stored;
  if (code === TEACHER_CODE) {
    state = { ...state, status: 'teacher', code };
  } else if (code) {
    state = { ...state, status: 'student', code, name: fromUrl && fromUrl !== stored ? null : lsGet(LS_NAME) };
    // URL code wins for this page but doesn't overwrite another student's stored code
    if (!stored) lsSet(LS_CODE, code);
    if (!state.name) void verify(code, false);
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== LS_CODE || fromUrl) return;
    const c = e.newValue;
    if (!c) emit({ status: 'none', code: null, name: null });
    else if (c === TEACHER_CODE) {
      queue = [];
      emit({ status: 'teacher', code: c, name: null });
    } else {
      emit({ status: 'student', code: c, name: lsGet(LS_NAME) });
      flush();
    }
  });
  window.addEventListener('pagehide', () => flush(true));
}

async function verify(code: string, save: boolean): Promise<boolean> {
  try {
    const r = await fetch(`/api/embed/student?code=${encodeURIComponent(code)}`);
    if (!r.ok) {
      if (r.status === 404 || r.status === 400) {
        emit({ error: 'Nie ma takiego kodu' });
        if (state.code === code) {
          if (save) lsSet(LS_CODE, null);
          emit({ status: 'none', code: null, name: null });
        }
      } else if (save) {
        emit({ error: 'Błąd serwera, spróbuj później' });
      }
      return false;
    }
    const { name } = (await r.json()) as { name: string };
    if (save) {
      lsSet(LS_CODE, code);
      lsSet(LS_NAME, name);
    } else if (lsGet(LS_CODE) === code) {
      lsSet(LS_NAME, name);
    }
    emit({ status: 'student', code, name, error: null });
    return true;
  } catch {
    // offline: keep the code, try sending later
    if (save) lsSet(LS_CODE, code);
    emit({ status: 'student', code, error: null });
    return true;
  }
}

/** Student typed a code in the bar */
export async function setCode(raw: string) {
  init();
  const code = normalizeCode(raw);
  if (!code) return false;
  if (code === TEACHER_CODE) {
    queue = [];
    lsSet(LS_CODE, code);
    lsSet(LS_NAME, null);
    emit({ status: 'teacher', code, name: null, error: null });
    return true;
  }
  emit({ error: null });
  const ok = await verify(code, true);
  if (ok) flush();
  return ok;
}

export function clearCode() {
  init();
  lsSet(LS_CODE, null);
  lsSet(LS_NAME, null);
  emit({ status: 'none', code: null, name: null, error: null });
}

let sending = false;
function flush(beacon = false) {
  if (state.status !== 'student' || !state.code || !queue.length || sending) return;
  const batch = queue.slice(0, 50);
  const body = JSON.stringify({ code: state.code, attempts: batch });
  if (beacon && typeof navigator.sendBeacon === 'function') {
    if (navigator.sendBeacon('/api/embed/attempt', body)) {
      queue = queue.slice(batch.length);
      emit({});
    }
    return;
  }
  sending = true;
  fetch('/api/embed/attempt', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
    .then((r) => {
      if (r.ok) {
        queue = queue.slice(batch.length);
        emit({});
      } else if (r.status === 404) {
        emit({ error: 'Nie ma takiego kodu' });
        clearCode();
      }
    })
    .catch(() => {
      /* offline — stays in queue */
    })
    .finally(() => {
      sending = false;
      if (queue.length && state.status === 'student') setTimeout(() => flush(), 1500);
    });
}

/** Call on every check. Safe outside embeds (no-op). */
export function trackAttempt(a: AttemptInput) {
  if (!EMBED_RESULTS_ENABLED) return;
  const ctx = context();
  if (!ctx) return;
  init();
  if (state.status === 'teacher') return;
  queue.push({
    ...a,
    lessonId: ctx.lessonId,
    embed: a.embed ?? ctx.embed,
    blockId: a.blockId == null ? null : String(a.blockId),
    itemId: String(a.itemId),
  });
  if (queue.length > 300) queue = queue.slice(-300);
  emit({});
  flush();
}

export function subscribe(l: () => void) {
  init();
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getState() {
  init();
  return state;
}
const serverState: TrackerState = { status: 'none', code: null, name: null, pending: 0, error: null };
export function getServerState() {
  return serverState;
}

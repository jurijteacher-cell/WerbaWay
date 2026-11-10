'use client';

/**
 * Records every «Sprawdź» in Notion embeds to Supabase under the logged-in account
 * (see embed-auth.ts). Attempts made before login wait in memory and are sent right after it.
 * Teacher accounts record nothing — for clicking through exercises on a screen share.
 */

import { getAccessToken, getState as authState, subscribe as authSubscribe } from '@/lib/embed-auth';

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

export type TrackerState = { pending: number; error: string | null };

/** Master switch: off hides the account bar and stops recording. */
export const EMBED_RESULTS_ENABLED = true;

let state: TrackerState = { pending: 0, error: null };
const serverState: TrackerState = { pending: 0, error: null };
let queue: Payload[] = [];
let initialized = false;
let sending = false;
const listeners = new Set<() => void>();

function emit(patch: Partial<TrackerState> = {}) {
  state = { ...state, ...patch, pending: queue.length };
  listeners.forEach((l) => l());
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
  // flush as soon as the account is known (login, restored session)
  authSubscribe(() => void flush());
  window.addEventListener('pagehide', () => void flush());
}

let retryMs = 0;

async function flush() {
  const a = authState();
  if (!a.userId || a.role === 'teacher' || !queue.length || sending) return;
  const token = await getAccessToken();
  if (!token) return;
  sending = true;
  const batch = queue.slice(0, 50);
  let failed = false;
  try {
    const r = await fetch('/api/embed/attempt', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ token, attempts: batch }),
    });
    if (r.ok) {
      queue = queue.slice(batch.length);
      retryMs = 0;
      emit({ error: null });
    } else {
      failed = true;
      // the server may have stored the first N before failing — do not send those twice
      const j = (await r.json().catch(() => ({}))) as { saved?: number };
      if (r.status !== 401 && typeof j.saved === 'number' && j.saved > 0) queue = queue.slice(j.saved);
      emit({
        error:
          r.status === 401
            ? 'Zaloguj się ponownie. / Увійди знову.'
            : 'Błąd serwera, spróbuję ponownie. / Помилка сервера, спробую ще раз.',
      });
    }
  } catch {
    failed = true; // offline — stays in queue
  } finally {
    sending = false;
    if (queue.length) {
      // success: send the next batch soon; failure: back off (2.5 s → 60 s)
      retryMs = failed ? Math.min(retryMs ? retryMs * 2 : 2500, 60000) : 0;
      setTimeout(() => void flush(), failed ? retryMs : 50);
    }
  }
}

/** Call on every check. Safe outside embeds (no-op). */
export function trackAttempt(a: AttemptInput) {
  if (!EMBED_RESULTS_ENABLED) return;
  const ctx = context();
  if (!ctx) return;
  init();
  if (authState().role === 'teacher') return;
  queue.push({
    ...a,
    lessonId: ctx.lessonId,
    embed: a.embed ?? ctx.embed,
    blockId: a.blockId == null ? null : String(a.blockId),
    itemId: String(a.itemId),
  });
  if (queue.length > 300) queue = queue.slice(-300);
  emit();
  void flush();
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
export function getServerState() {
  return serverState;
}

'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Exercise progress kept in the student's browser, so an embed reopens where they left off.
 *
 * Key = embed URL (lesson + embed + ?blocks=) + scope + account id («anon» when logged out).
 * Anonymous progress is adopted once the student logs in. Storage can be
 * blocked or wiped (private mode, Safari third-party iframes) — every call is wrapped and the
 * exercise simply starts empty then. Server-side results (embed-tracker) are not touched here.
 */

const PREFIX = 'ww_progress_v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180; // half a year

type Envelope<T> = { t: number; d: T };

function studentCode(): string {
  try {
    return window.localStorage.getItem('ww_embed_uid') || 'anon';
  } catch {
    return 'anon';
  }
}

function embedPath(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.delete('s'); // student code in the URL is not part of the exercise identity
  url.searchParams.delete('ww_watch'); // вікно викладача («Дивитися») — не частина ідентичності вправи
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const q = params.map(([k, v]) => `${k}=${v}`).join('&');
  return url.pathname + (q ? `?${q}` : '');
}

function keyFor(scope: string, code: string) {
  return `${PREFIX}|${embedPath()}|${scope}|${code}`;
}

/* ── «Дивитися учня»: спостерігач (вікно вправи в викладача) читає стан з пам'яті, а не з localStorage ── */

/** Вправа відкрита в iframe викладача з ?ww_watch=1: нічого не пише, стан приходить від учня. */
export function isSpectator(): boolean {
  try {
    return typeof window !== 'undefined' && window.parent !== window && new URLSearchParams(window.location.search).has('ww_watch');
  } catch {
    return false;
  }
}

const liveStore = new Map<string, unknown>();

/** Стан від учня: `null` у значенні — scope скинуто; `full` — замінити все. */
export function setLiveState(s: Record<string, unknown>, full?: boolean) {
  if (full) liveStore.clear();
  for (const [scope, d] of Object.entries(s)) {
    if (d === null || d === undefined) liveStore.delete(scope);
    else liveStore.set(scope, d);
  }
}

export function hasLiveState(): boolean {
  return liveStore.size > 0;
}

/** Розбір ключа localStorage `ww_progress_v1|<embedPath>|<scope>|<code>` (у embedPath `|` не буває, але на всяк випадок беремо краї). */
export function parseProgressKey(k: string | null): { embedPath: string; scope: string; code: string } | null {
  if (!k || !k.startsWith(`${PREFIX}|`)) return null;
  const parts = k.split('|');
  if (parts.length < 4) return null;
  return { code: parts[parts.length - 1], scope: parts[parts.length - 2], embedPath: parts.slice(1, -2).join('|') };
}

/** Код учня, під яким вправи зараз пишуть прогрес ('anon' — без входу) */
export function currentProgressCode(): string {
  return studentCode();
}

/** Чи прогрес цього коду належить поточному учневі (його код; 'anon' — лише поки код не заведено) */
export function isOwnProgressCode(code: string): boolean {
  return code === studentCode();
}

/** Увесь збережений стан одного вікна вправи: scope → дані. Для повного знімка викладачеві. */
export function readAllProgress(matchEmbedPath: (embedPath: string) => boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof window === 'undefined') return out;
  const mine = studentCode();
  const codes = mine === 'anon' ? ['anon'] : [mine, 'anon']; // як у loadProgress: свій код важливіший за anon
  const best = new Map<string, number>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      const pk = parseProgressKey(k);
      if (!pk || !codes.includes(pk.code) || !matchEmbedPath(pk.embedPath)) continue;
      const rank = codes.indexOf(pk.code);
      if (best.has(pk.scope) && best.get(pk.scope)! <= rank) continue;
      const raw = window.localStorage.getItem(k!);
      if (!raw) continue;
      const env = JSON.parse(raw) as Envelope<unknown>;
      if (!env || typeof env.t !== 'number' || Date.now() - env.t > MAX_AGE_MS) continue;
      out[pk.scope] = env.d;
      best.set(pk.scope, rank);
    }
  } catch {
    /* storage заблоковано — віддаємо, що вдалось зібрати */
  }
  return out;
}

export function loadProgress<T>(scope: string): T | null {
  if (typeof window === 'undefined') return null;
  if (isSpectator()) return (liveStore.get(scope) as T | undefined) ?? null;
  const code = studentCode();
  for (const c of code === 'anon' ? ['anon'] : [code, 'anon']) {
    try {
      const raw = window.localStorage.getItem(keyFor(scope, c));
      if (!raw) continue;
      const env = JSON.parse(raw) as Envelope<T>;
      if (!env || typeof env.t !== 'number' || Date.now() - env.t > MAX_AGE_MS) continue;
      return env.d;
    } catch {
      /* corrupt or blocked — ignore */
    }
  }
  return null;
}

export function saveProgress<T>(scope: string, data: T) {
  if (typeof window === 'undefined' || isSpectator()) return;
  try {
    const env: Envelope<T> = { t: Date.now(), d: data };
    const code = studentCode();
    window.localStorage.setItem(keyFor(scope, code), JSON.stringify(env));
    // once a code is in use, the anonymous copy has been adopted — drop it so the next
    // student on this computer doesn't inherit it
    if (code !== 'anon') window.localStorage.removeItem(keyFor(scope, 'anon'));
  } catch {
    /* quota / blocked — progress just isn't kept */
  }
}

export function clearProgress(scope: string) {
  if (typeof window === 'undefined' || isSpectator()) return;
  for (const c of new Set([studentCode(), 'anon'])) {
    try {
      window.localStorage.removeItem(keyFor(scope, c));
    } catch {
      /* ignore */
    }
  }
}

/** True when a record has anything worth restoring. */
export function hasAny(...records: Array<Record<string, unknown> | undefined | null>) {
  return records.some((r) => r && Object.keys(r).length > 0);
}

/* ── hook for simple components ──────────────────────────────────────────── */

/**
 * `useState` that survives closing the embed. Restores after mount (no hydration mismatch),
 * saves on every change. `restored` is true when something non-empty was brought back.
 */
export function usePersistentState<T extends Record<string, unknown>>(scope: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = loadProgress<T>(scope);
    if (saved && typeof saved === 'object') {
      setValue({ ...initial, ...saved });
      if (Object.values(saved).some((v) => v && typeof v === 'object' && Object.keys(v).length > 0)) setRestored(true);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    if (ready) saveProgress(scope, value);
  }, [ready, scope, value]);

  const reset = useCallback(() => {
    clearProgress(scope);
    setValue(initial);
    setRestored(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return { value, setValue, restored, dismissRestored: () => setRestored(false), reset };
}

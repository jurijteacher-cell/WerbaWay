'use client';

/**
 * «Дивитися учня»: викладач ЧУЄ те, що учень відтворює у слуханні. Учень пише в прогрес запис
 * `mx-audio` ({ src, playing, pos, n }) на кожну подію плеєра й раз на кілька секунд, поки грає;
 * тут його відтворює окремий <audio> викладача. Він живе в модулі, а не в React-дереві:
 * вправа спостерігача перемонтовується на кожне оновлення стану, і звук від цього не має обриватись.
 *
 * Свіжий стан (full: true — знімок при відкритті вікна) лише ставить на паузу/позицію: «playing» у ньому
 * може бути застарілим, а автозапуск без причини — гірше за тишу.
 */

export type LiveAudioRec = { src: string; playing: boolean; pos: number; n?: number };

type Listener = () => void;
const listeners = new Set<Listener>();
let el: HTMLAudioElement | null = null;
let muted = false;
let blocked = false;
let active = false;

/** Знімок для useSyncExternalStore: той самий об'єкт, доки стан не змінився (інакше React зациклюється) */
let snap = { muted, blocked, active };
const emit = () => {
  snap = { muted, blocked, active };
  listeners.forEach((l) => l());
};
export const subscribeLiveAudio = (l: Listener) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const liveAudioState = () => snap;

function audio(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
  }
  return el;
}

export function setLiveAudioMuted(m: boolean) {
  muted = m;
  if (m) el?.pause();
  emit();
}

/** Клік викладача знімає блокування автозапуску браузера */
export function resumeLiveAudio() {
  blocked = false;
  const a = el;
  if (a && a.src && !muted) void a.play().catch(() => { blocked = true; emit(); });
  emit();
}

export function applyLiveAudio(rec: LiveAudioRec | null | undefined, full: boolean) {
  if (typeof window === 'undefined') return;
  if (!rec || !rec.src) {
    el?.pause();
    return;
  }
  const a = audio();
  const abs = new URL(rec.src, window.location.origin).toString();
  if (a.src !== abs) a.src = abs;
  if (!active) {
    active = true;
    emit();
  }
  const pos = Number.isFinite(rec.pos) ? Math.max(0, rec.pos) : 0;
  if (!rec.playing || full) {
    a.pause();
    if (Math.abs(a.currentTime - pos) > 0.5) a.currentTime = pos;
    return;
  }
  if (muted) return;
  if (Math.abs(a.currentTime - pos) > 1.5) a.currentTime = pos;
  if (a.paused) {
    void a.play().then(
      () => {
        if (blocked) {
          blocked = false;
          emit();
        }
      },
      () => {
        blocked = true;
        emit();
      }
    );
  }
}

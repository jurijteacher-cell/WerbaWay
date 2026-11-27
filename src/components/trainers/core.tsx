'use client';

/**
 * Спільне для тренажерів A0 (alfabet, sluchaj-wybierz, czytaj-glosno, liczby, dialogi, czytanie, mapa-pl):
 * озвучка з файлів уроку, анімації Lottie (Noto Animated Emoji), конфеті, шапка вправи.
 * Файли лежать у public{asset_base}/audio/{slug}.mp3 і public{asset_base}/anim/{slug}.json —
 * один слаг на обидва (LESSON_PROTOCOL_A0-A1 §5.3).
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import './trainers.css';

export type TrainerBase = {
  lesson_id: string;
  exercise_type: string;
  asset_base: string;
  title: string;
  instruction?: string;
  instruction_uk?: string;
  credits?: string;
};

/* ── озвучка ─────────────────────────────────────────────────────────────── */

const audioCache = new Map<string, HTMLAudioElement>();
let current: HTMLAudioElement | null = null;

function speakFallback(text?: string) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pl-PL';
    u.rate = 0.82;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('pl'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* немає синтезу — мовчимо */
  }
}

/** say(slug, text): грає {base}/audio/{slug}.mp3; не вдалося — синтез браузера польською. */
export function useSay(base: string) {
  return useCallback(
    (slug?: string | null, text?: string) => {
      if (!slug) return speakFallback(text);
      const src = `${base}/audio/${slug}.mp3`;
      let a = audioCache.get(src);
      if (!a) {
        a = new Audio(src);
        a.preload = 'auto';
        audioCache.set(src, a);
      }
      try {
        if (current && current !== a) current.pause();
        a.pause();
        if (a.readyState > 0) a.currentTime = 0;
      } catch {
        /* ignore */
      }
      current = a;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => speakFallback(text));
    },
    [base]
  );
}

/** Скільки триває файл (для «послухати все по черзі»). */
export function wait(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}

/* ── анімації Lottie ────────────────────────────────────────────────────── */

type LottieAnim = { destroy(): void; play(): void; pause(): void };
type LottiePlayer = {
  loadAnimation(o: Record<string, unknown>): LottieAnim;
  setQuality?(q: string): void;
};
let lottiePromise: Promise<LottiePlayer> | null = null;
function loadLottie(): Promise<LottiePlayer> {
  if (!lottiePromise) {
    lottiePromise = import('lottie-web/build/player/lottie_light').then((m) => {
      const l = ((m as unknown as { default?: LottiePlayer }).default ?? m) as LottiePlayer;
      try {
        l.setQuality?.('low');
      } catch {
        /* ignore */
      }
      return l;
    });
  }
  return lottiePromise;
}

/**
 * Анімація під словом. Вантажиться лише в полі зору (IntersectionObserver), поза ним — пауза:
 * 39 файлів одночасно поклали б телефон. Без анімації (`slug` порожній) — нічого не малює.
 */
export function Anim({ base, slug, className, eager }: { base: string; slug?: string | null; className?: string; eager?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !slug) return;
    let anim: LottieAnim | null = null;
    let dead = false;
    let visible = !!eager;
    const start = () => {
      if (anim || dead) return;
      loadLottie()
        .then((lottie) => {
          if (dead || anim) return;
          el.innerHTML = '';
          anim = lottie.loadAnimation({
            container: el,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: `${base}/anim/${slug}.json`,
            rendererSettings: { progressiveLoad: true, preserveAspectRatio: 'xMidYMid meet' },
          });
          if (!visible) anim.pause();
        })
        .catch(() => {
          /* без анімації */
        });
    };
    if (eager || typeof IntersectionObserver === 'undefined') {
      start();
      return () => {
        dead = true;
        anim?.destroy();
        el.innerHTML = '';
      };
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          visible = e.isIntersecting;
          if (e.isIntersecting) {
            if (!anim) start();
            else anim.play();
          } else anim?.pause();
        }
      },
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => {
      dead = true;
      io.disconnect();
      anim?.destroy();
      el.innerHTML = '';
    };
  }, [base, slug, eager]);
  if (!slug) return null;
  return <div ref={ref} className={className} aria-hidden="true" />;
}

/* ── конфеті ────────────────────────────────────────────────────────────── */

const CONF = ['#7a4fe0', '#2f9fe0', '#d1397f', '#0f7a55'];

/** Конфеті навколо елемента (усередині .tr, бо вікно вправи без власного скролу). */
export function burst(from?: Element | null) {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const root = (from?.closest('.ww-tr') as HTMLElement | null) ?? (document.querySelector('.ww-tr') as HTMLElement | null);
  if (!root) return;
  const rr = root.getBoundingClientRect();
  const fr = from?.getBoundingClientRect() ?? rr;
  const cx = fr.left - rr.left + fr.width / 2;
  const cy = fr.top - rr.top + Math.min(fr.height / 2, 120);
  const box = document.createElement('div');
  box.className = 'conf';
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('i');
    p.style.left = `${cx - 60 + Math.random() * 120}px`;
    p.style.top = `${cy - 30 + Math.random() * 40}px`;
    p.style.background = CONF[i % 4];
    p.style.animationDelay = `${Math.random() * 0.18}s`;
    box.appendChild(p);
  }
  root.appendChild(box);
  window.setTimeout(() => box.remove(), 1100);
}

/* ── каркас ─────────────────────────────────────────────────────────────── */

export function TrainerShell({ data, children, credits = true }: { data: TrainerBase; children: ReactNode; credits?: boolean }) {
  return (
    <div className="ww-tr" data-block-id={data.exercise_type}>
      <div className="tr-head">
        <div className="label">Werba Way · A0</div>
        <h2>{data.title}</h2>
        {data.instruction && <p className="pl">{data.instruction}</p>}
        {data.instruction_uk && <p className="gl">{data.instruction_uk}</p>}
      </div>
      <div className="panel">{children}</div>
      {credits && data.credits && <p className="credits">{data.credits}</p>}
    </div>
  );
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

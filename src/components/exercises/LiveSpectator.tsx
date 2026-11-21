'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { hasLiveState, isSpectator, setLiveState } from '@/lib/embed-progress';
import { liveKey } from '@/lib/live/protocol';
import { useT } from '@/i18n/client';

/** Типи вправ, що наживо не показуються: свій сховище й запити до API на кожному кроці */
const NOT_LIVE = /^\/embed\/[^/]+\/(mock-exam|placement)(\/|$)/;

/**
 * Вікно вправи в режимі «Дивитися учня» (iframe викладача з ?ww_watch=1).
 * Стан учня приходить від батьківської сторінки (LiveWatch) повідомленням `ww-live-state`;
 * вправи читають його з пам'яті через embed-progress (loadProgress у режимі спостерігача),
 * тому після кожного оновлення вміст просто перемонтовується — зберігши прокрутку.
 * Поза «Дивитися» компонент нічого не робить: віддає children як є.
 */
export function LiveSpectator({ children }: { children: ReactNode }) {
  const t = useT();
  const [spec, setSpec] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [has, setHas] = useState(false);
  const [gen, setGen] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSpectator()) return;
    setSpec(true);
    if (NOT_LIVE.test(window.location.pathname)) setBlocked(true);
    const key = liveKey(window.location.href);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) return; // кілька оновлень поспіль зливаємо в одне перемонтування
      timer = setTimeout(() => {
        timer = null;
        const y = window.scrollY;
        // на час перемонтування тримаємо висоту: інакше сторінка на мить «схлопується» й екран смикається
        const box = boxRef.current;
        if (box) box.style.minHeight = `${box.offsetHeight}px`;
        setHas(hasLiveState());
        setGen((g) => g + 1);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.scrollTo(0, y);
            if (box) box.style.minHeight = '';
          })
        );
      }, 250);
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; s?: Record<string, unknown>; full?: boolean } | null;
      if (!d || d.type !== 'ww-live-state') return;
      setLiveState(d.s ?? {}, !!d.full);
      refresh();
    };

    window.addEventListener('message', onMessage);
    // батьківська сторінка відповість збереженим станом і попросить свіжий в учня
    window.parent.postMessage({ type: 'ww-live-hello', key }, window.location.origin);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!spec) return <>{children}</>;

  const note: CSSProperties = {
    margin: '0 0 10px',
    padding: '6px 12px',
    borderRadius: 8,
    background: '#eef1fb',
    color: '#4a5278',
    fontSize: 13,
  };

  if (blocked) {
    return <p style={note}>{t('Цей тип вправи наживо не показується.')}</p>;
  }
  return (
    <>
      <p style={note}>
        👁 {has ? t('Відповіді учня · наживо') : t('Учень ще нічого не вписав')}
      </p>
      <div ref={boxRef}>
        <div key={gen}>{children}</div>
      </div>
    </>
  );
}

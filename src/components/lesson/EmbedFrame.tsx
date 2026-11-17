'use client';

import { useEffect, useRef, useState } from 'react';
import type { EmbedKind } from '@/lib/pages/pages';
import { useLocale, useT, withLang } from '@/i18n/client';

/** Висота вікна вправи: фіксована за типом (як у Notion), далі скрол усередині. */
const HEIGHT: Record<EmbedKind, number> = {
  exam: 820,
  'comm-tasks': 860,
  slides: 760,
  grammar: 900,
  hw: 900,
  vocab: 760,
  'grammar-board': 900,
  notes: 760,
  pictures: 820,
  'mock-exam': 1100,
  placement: 1000,
  quizlet: 520,
  other: 760,
};

const LABEL: Record<EmbedKind, string> = {
  exam: 'Jak na egzaminie',
  'comm-tasks': 'Zadania',
  slides: 'Prezentacja',
  grammar: 'Ćwiczenia',
  hw: 'Praca domowa',
  vocab: 'Słownictwo',
  'grammar-board': 'Gramatyka',
  notes: 'Notatki',
  pictures: 'Obrazki',
  'mock-exam': 'Egzamin próbny',
  placement: 'Test',
  quizlet: 'Fiszki',
  other: 'Ćwiczenie',
};

/** стеля на випадок, якщо вправа колись повідомить абсурдну висоту */
const MAX_HEIGHT = 6000;

export function EmbedFrame({ src: rawSrc, title, kind }: { src: string; title: string; kind: EmbedKind }) {
  const [loaded, setLoaded] = useState(false);
  const [auto, setAuto] = useState<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const locale = useLocale();
  const t = useT();
  // вправа живе в iframe: куки туди не доходять, тож мову передаємо параметром
  const src = withLang(rawSrc, locale);
  const h = HEIGHT[kind];

  // вправа сама каже, якої вона висоти (див. HeightReporter) — інакше на телефоні
  // виходив скрол усередині скролу: вміст під 1700 px у вікні на 715 px
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; height?: number };
      if (d?.type !== 'ww:embed-height' || typeof d.height !== 'number') return;
      setAuto(Math.min(Math.max(Math.ceil(d.height), 240), MAX_HEIGHT));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // поки висота не приїхала — тримаємо колишню, щоб сторінка не стрибала
  const height = auto ? `${auto}px` : `min(${h}px, 88vh)`;

  return (
    <figure className="lp-embed" data-kind={kind}>
      <figcaption>
        <span className="lp-embed-tag">{LABEL[kind]}</span>
        <span className="lp-embed-title">{title}</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="lp-embed-open">
          {t('відкрити окремо')} ↗
        </a>
      </figcaption>
      <div className="lp-embed-frame" style={{ height }}>
        {!loaded && <div className="lp-embed-skel">{t('Завантаження…')}</div>}
        <iframe
          ref={frame}
          src={src}
          title={title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          allow="autoplay; fullscreen; clipboard-write"
        />
      </div>
    </figure>
  );
}

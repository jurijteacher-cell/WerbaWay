'use client';

import { useRef, useState } from 'react';
import { useAutoFrame } from './useAutoFrame';
import type { EmbedKind } from '@/lib/pages/pages';
import { useLocale, useT, withLang } from '@/i18n/client';
import { liveKey } from '@/lib/live/protocol';

/**
 * Початкова (до першого повідомлення вправи) і мінімальна висота вікна вправи.
 * Власних скролів немає: внутрішні вправи (/embed, /slides) повідомляють свою висоту (FrameSync),
 * і вікно розтягується на весь вміст. Фіксована висота лишається лише для зовнішніх сайтів (Quizlet тощо),
 * яких ми не можемо виміряти.
 */
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

/** `watch` — вікно викладача в «Дивитися»: вправа відкривається в режимі спостерігача (?ww_watch=1) */
export function EmbedFrame({ src: rawSrc, title, kind, watch }: { src: string; title: string; kind: EmbedKind; watch?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const locale = useLocale();
  const t = useT();
  // вправа живе в iframe: куки туди не доходять, тож мову передаємо параметром
  const langSrc = withLang(rawSrc, locale);
  const spectate = !!watch && langSrc.startsWith('/');
  const src = spectate ? `${langSrc}${langSrc.includes('?') ? '&' : '?'}ww_watch=1` : langSrc;
  const base = HEIGHT[kind];
  const auto = src.startsWith('/');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { height: h, sendViewport } = useAutoFrame(frameRef, auto, () => setLoaded(true));

  const frameStyle = auto ? { height: h ?? Math.min(base, 520) } : { height: `min(${base}px, 88vh)` };
  return (
    <figure className="lp-embed" data-kind={kind}>
      <figcaption>
        <span className="lp-embed-tag">{LABEL[kind]}</span>
        <span className="lp-embed-title">{title}</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="lp-embed-open">
          {t('відкрити окремо')} ↗
        </a>
      </figcaption>
      <div className="lp-embed-frame" data-auto={auto ? '' : undefined} style={frameStyle}>
        {!loaded && <div className="lp-embed-skel">{t('Завантаження…')}</div>}
        <iframe
          ref={frameRef}
          scrolling={auto ? 'no' : undefined}
          src={src}
          title={title}
          data-ww-live={spectate ? liveKey(src) : undefined}
          loading="lazy"
          onLoad={() => { setLoaded(true); sendViewport(); }}
          allow="autoplay; fullscreen; clipboard-write"
        />
      </div>
    </figure>
  );
}

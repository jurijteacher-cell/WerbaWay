'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Анімований стікер замість довгих написів. Те, що раніше було абзацом тексту, ховається
 * в підказку: з'являється при наведенні, фокусі з клавіатури й дотику (на телефоні — тап).
 *
 *   icon  — eye (око, що кліпає й дивиться вбік) | info (літера «i», що пульсує)
 *   place — де розкривається підказка: down-start (під стікером, від лівого краю),
 *           down-end (під стікером, до правого краю), up-center (над стікером, по центру)
 */
export function InfoSticker({
  label,
  title,
  items,
  icon = 'info',
  place = 'down-start',
  tone = 'violet',
  className = '',
}: {
  /** короткий підпис для скрінрідера */
  label: string;
  title: string;
  /** впорядковані пункти підказки */
  items: string[];
  icon?: 'eye' | 'info';
  place?: 'down-start' | 'down-end' | 'up-center';
  tone?: 'violet' | 'sky' | 'pink';
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={box} className={`ww-sticker ${className}`} data-open={open || undefined} data-place={place}>
      <button
        type="button"
        className="ww-sticker-btn"
        data-tone={tone}
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon === 'eye' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <g className="ww-eye-lid">
              <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
              <g className="ww-eye-pupil">
                <circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none" />
              </g>
            </g>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle className="ww-info-ring" cx="12" cy="12" r="9.2" />
            <path d="M12 11v5.2" />
            <circle cx="12" cy="7.7" r=".6" fill="currentColor" />
          </svg>
        )}
      </button>
      <span id={id} role="tooltip" className="ww-sticker-tip">
        <b className="ww-sticker-tip-title">{title}</b>
        <ol>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      </span>
    </span>
  );
}

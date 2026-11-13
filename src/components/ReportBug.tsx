'use client';

import { useEffect, useState } from 'react';

/**
 * Кнопка «Повідомити про помилку» на кожній сторінці.
 * До тексту сама додає адресу сторінки й урок — щоб не питати учня, де саме зламалось.
 */
export function ReportBug() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function send() {
    if (!text.trim() || state === 'sending') return;
    setState('sending');
    const slug = /\/(?:learn|embed|s)\/([a-z0-9-]+)/.exec(location.pathname)?.[1] ?? null;
    try {
      const r = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          pageUrl: location.href,
          lessonSlug: slug,
          context: { ua: navigator.userAgent, w: innerWidth, h: innerHeight },
        }),
      });
      if (!r.ok) throw new Error();
      setState('sent');
      setText('');
      setTimeout(() => {
        setOpen(false);
        setState('idle');
      }, 1600);
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <button type="button" className="ww-report-btn" onClick={() => setOpen(true)} title="Повідомити про помилку">
        <span aria-hidden="true">⚑</span>
        <span className="ww-report-btn-text">Помилка?</span>
      </button>

      {open && (
        <div className="ww-report-back" role="dialog" aria-modal="true" aria-label="Повідомити про помилку">
          <div className="ww-report-card">
            <p className="ww-report-head">Що не так на цій сторінці?</p>
            <p className="ww-report-sub">
              Напиши своїми словами — що робив і що пішло не так. Адресу сторінки додам сам.
            </p>
            <textarea
              className="ww-input ww-report-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Напр.: у вправі 3 не зараховує правильну відповідь «chciałbym»"
              rows={4}
              autoFocus
            />
            {state === 'error' && <p className="ww-report-err">Не вдалось надіслати. Спробуй ще раз.</p>}
            {state === 'sent' && <p className="ww-report-ok">Дякую, надіслано.</p>}
            <div className="ww-report-row">
              <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => setOpen(false)}>
                Закрити
              </button>
              <button
                type="button"
                className="ww-btn ww-btn-primary ww-btn-sm"
                onClick={send}
                disabled={!text.trim() || state === 'sending' || state === 'sent'}
              >
                {state === 'sending' ? 'Надсилаю…' : 'Надіслати'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

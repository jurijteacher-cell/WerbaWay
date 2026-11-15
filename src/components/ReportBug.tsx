'use client';


import { useT } from '@/i18n/client';
import { useEffect, useState } from 'react';

/** Подія, якою меню «Ще» на телефоні відкриває діалог */
export const REPORT_EVENT = 'ww:report';
export const openReport = () => window.dispatchEvent(new Event(REPORT_EVENT));

/**
 * Кнопка «Повідомити про помилку» на кожній сторінці.
 * До тексту сама додає адресу сторінки й урок — щоб не питати учня, де саме зламалось.
 */
export function ReportBug() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  // сторінка в кадрі нашого ж сайту (клас, вправа всередині лекції): кнопка вже є на сторінці навколо,
  // друга лягала поверх першої. У Notion (чужий домен) кнопка лишається.
  const [inSiteFrame, setInSiteFrame] = useState(false);
  useEffect(() => {
    try {
      setInSiteFrame(window.parent !== window && window.parent.location.origin === window.location.origin);
    } catch {
      /* батько з іншого домену — це Notion чи інший сайт, кнопку лишаємо */
    }
  }, []);

  // на телефоні кнопки немає (вона перекривала вміст) — діалог відкривається з меню «Ще» нижньої панелі
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(REPORT_EVENT, onOpen);
    return () => window.removeEventListener(REPORT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function send() {
    if (!text.trim() || state === 'sending') return;
    setState('sending');
    // у класі адреса сторінки — /class, а урок відкрито в кадрі: беремо адресу кадру
    const frame = location.pathname.startsWith('/class')
      ? document.querySelector<HTMLIFrameElement>('.cls-sheet:last-child iframe')?.src ?? null
      : null;
    const where = frame ? new URL(frame, location.href) : location;
    const slug = /\/(?:learn|embed|s|slides)\/([a-z0-9-]+)/.exec(where.pathname)?.[1] ?? null;
    try {
      const r = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          pageUrl: frame ? `${location.href} → ${where.href}` : location.href,
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

  if (inSiteFrame) return null;

  return (
    <>
      <button type="button" className="ww-report-btn" onClick={() => setOpen(true)} title={t("Повідомити про помилку")}>
        <span aria-hidden="true">⚑</span>
        <span className="ww-report-btn-text">{t("Помилка?")}</span>
      </button>

      {open && (
        <div className="ww-report-back" role="dialog" aria-modal="true" aria-label={t("Повідомити про помилку")}>
          <div className="ww-report-card">
            <p className="ww-report-head">{t("Що не так на цій сторінці?")}</p>
            <p className="ww-report-sub">
              {t("Напиши своїми словами — що робив і що пішло не так. Адресу сторінки додам сам.")}
            </p>
            <textarea
              className="ww-input ww-report-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("Напр.: у вправі 3 не зараховує правильну відповідь «chciałbym»")}
              rows={4}
              autoFocus
            />
            {state === 'error' && <p className="ww-report-err">{t("Не вдалось надіслати. Спробуй ще раз.")}</p>}
            {state === 'sent' && <p className="ww-report-ok">{t("Дякую, надіслано.")}</p>}
            <div className="ww-report-row">
              <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => setOpen(false)}>
                {t("Закрити")}
              </button>
              <button
                type="button"
                className="ww-btn ww-btn-primary ww-btn-sm"
                onClick={send}
                disabled={!text.trim() || state === 'sending' || state === 'sent'}
              >
                {state === 'sending' ? t("Надсилаю…") : t("Надіслати")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

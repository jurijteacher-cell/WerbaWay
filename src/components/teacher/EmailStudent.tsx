'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';

type Info = { configured: boolean; email: string | null };

/** «Написати листа» на сторінці учня: лист іде з school@werbaway.com, відповідь учня — на пошту викладача. */
export function EmailStudent({ studentId, name }: { studentId: string; name: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || info) return;
    fetch(`/api/teacher/email?studentId=${encodeURIComponent(studentId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d ?? { configured: false, email: null }))
      .catch(() => setInfo({ configured: false, email: null }));
  }, [open, info, studentId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && state !== 'sending' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, state]);

  async function send() {
    if (!subject.trim() || !message.trim() || state === 'sending') return;
    setState('sending');
    setErr(null);
    try {
      const r = await fetch('/api/teacher/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentId, subject: subject.trim(), message: message.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
      setState('sent');
      setSubject('');
      setMessage('');
    } catch (e) {
      setState('error');
      setErr(e instanceof Error ? e.message : '');
    }
  }

  const ready = info?.configured && info.email;

  return (
    <>
      <button type="button" className="ww-btn ww-btn-secondary" onClick={() => setOpen(true)}>
        {t("✉️ Написати листа")}
      </button>
      {open && (
        <div className="ww-report-back" role="dialog" aria-modal="true" aria-label={t("Лист учню")}>
          <div className="ww-report-card" style={{ maxWidth: '36rem' }}>
            <p className="ww-report-head">{t("Лист для {name}", { name })}</p>
            <p className="ww-report-sub">
              {!info
                ? t("Перевіряю адресу…")
                : !info.configured
                  ? t("Пошта сайту ще не налаштована.")
                  : !info.email
                    ? t("У цього учня немає адреси пошти.")
                    : t("Кому: {email}. Лист прийде від Werba Way, а відповідь учня — на вашу пошту.", { email: info.email })}
            </p>
            {state === 'sent' ? (
              <p className="mb-3 text-correct">{t("Лист надіслано.")}</p>
            ) : (
              <>
                <label className="ww-field mb-3 block">
                  <span>{t("Тема")}</span>
                  <input className="ww-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} disabled={!ready} />
                </label>
                <label className="ww-field mb-3 block">
                  <span>{t("Текст")}</span>
                  <textarea
                    className="ww-input ww-report-text"
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={!ready}
                  />
                </label>
                {state === 'error' && <p className="mb-3 text-incorrect">{t("Не вдалося надіслати")}{err ? `: ${err}` : ''}</p>}
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="ww-btn ww-btn-ghost" onClick={() => setOpen(false)} disabled={state === 'sending'}>
                {state === 'sent' ? t("Закрити") : t("Скасувати")}
              </button>
              {state === 'sent' ? (
                <button type="button" className="ww-btn ww-btn-secondary" onClick={() => setState('idle')}>
                  {t("Ще один лист")}
                </button>
              ) : (
                <button
                  type="button"
                  className="ww-btn ww-btn-primary"
                  onClick={send}
                  disabled={!ready || !subject.trim() || !message.trim() || state === 'sending'}
                >
                  {state === 'sending' ? t("Надсилаю…") : t("Надіслати")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

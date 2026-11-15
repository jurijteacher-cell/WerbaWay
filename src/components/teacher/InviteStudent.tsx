'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';

type Result =
  | { kind: 'sent'; email: string; userId: string }
  | { kind: 'exists'; userId: string | null }
  | { kind: 'error'; message: string };

/**
 * «Запросити учня» на /teacher/students: викладач вводить пошту — учень отримує лист
 * з особистим посиланням і сам дописує ім'я, прізвище й пароль (/welcome).
 * Після запрошення — посилання на сторінку учня, щоб одразу відкрити йому курс.
 */
export function InviteStudent() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, sending]);

  function close() {
    if (sending) return;
    setOpen(false);
    setResult(null);
    setEmail('');
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || sending) return;
    setSending(true);
    setResult(null);
    try {
      const r = await fetch('/api/teacher/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; userId?: string | null; email?: string };
      if (r.status === 409) setResult({ kind: 'exists', userId: d.userId ?? null });
      else if (!r.ok || !d.userId) setResult({ kind: 'error', message: errorText(d.error, r.status) });
      else {
        setResult({ kind: 'sent', email: d.email ?? value, userId: d.userId });
        router.refresh();
      }
    } catch {
      setResult({ kind: 'error', message: t("Немає зв'язку з сайтом. Спробуйте ще раз") });
    } finally {
      setSending(false);
    }
  }

  function errorText(code: string | undefined, status: number) {
    if (code === 'bad email') return t("Перевірте адресу пошти");
    if (code === 'mail not configured' || code === 'admin not configured') return t("Пошта сайту ще не налаштована.");
    return `${t("Не вдалося надіслати")}${code ? `: ${code}` : ` (HTTP ${status})`}`;
  }

  return (
    <>
      <button type="button" className="ww-btn ww-btn-primary" onClick={() => setOpen(true)}>
        {t("＋ Запросити учня")}
      </button>
      {open && (
        <div className="ww-report-back" role="dialog" aria-modal="true" aria-label={t("Запросити учня")}>
          <div className="ww-report-card" style={{ maxWidth: '32rem' }}>
            <p className="ww-report-head">{t("Запросити учня")}</p>
            <p className="ww-report-sub">
              {t("Учень отримає лист з особистим посиланням: допише ім'я та прізвище й придумає пароль. Відповідь на лист прийде на вашу пошту.")}
            </p>

            {result?.kind === 'sent' ? (
              <div className="mb-4">
                <p className="mb-2 text-correct">{t("Запрошення надіслано на {email}.", { email: result.email })}</p>
                <p className="text-sm text-paper-muted">
                  {t("Учень уже є у списку. Відкрийте його сторінку, щоб дати доступ до курсу — тоді лекції чекатимуть його одразу після реєстрації.")}
                </p>
              </div>
            ) : (
              <form id="invite-student" onSubmit={send}>
                <label className="ww-field mb-3 block">
                  <span>{t("Пошта учня")}</span>
                  <input
                    className="ww-input"
                    type="email"
                    required
                    autoFocus
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    disabled={sending}
                  />
                </label>
                {result?.kind === 'exists' && (
                  <p className="mb-3 text-sm text-paper-muted">
                    {t("У цієї адреси вже є акаунт. Якщо учень не пам'ятає пароль, хай натисне «Забув пароль» на сторінці входу.")}{' '}
                    {result.userId && (
                      <Link href={`/teacher/students/${result.userId}`} className="text-gold hover:text-gold-bright">
                        {t("Відкрити учня")}
                      </Link>
                    )}
                  </p>
                )}
                {result?.kind === 'error' && <p className="mb-3 text-incorrect">{result.message}</p>}
              </form>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="ww-btn ww-btn-ghost" onClick={close} disabled={sending}>
                {result?.kind === 'sent' ? t("Закрити") : t("Скасувати")}
              </button>
              {result?.kind === 'sent' ? (
                <>
                  <button
                    type="button"
                    className="ww-btn ww-btn-secondary"
                    onClick={() => {
                      setResult(null);
                      setEmail('');
                    }}
                  >
                    {t("Ще одне запрошення")}
                  </button>
                  <Link href={`/teacher/students/${result.userId}`} className="ww-btn ww-btn-primary">
                    {t("Відкрити учня")}
                  </Link>
                </>
              ) : (
                <button type="submit" form="invite-student" className="ww-btn ww-btn-primary" disabled={!email.trim() || sending}>
                  {sending ? t("Надсилаю…") : t("Надіслати запрошення")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

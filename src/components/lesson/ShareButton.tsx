'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Student = { id: string; name: string; lesson: boolean; viaCourse: boolean; done: boolean };
type Tab = 'student' | 'link';

/**
 * «Поділитися» лекцією (лише викладач):
 *  • учню — лекція одразу з'являється в його «Курсі» (student_access, kind=lesson);
 *  • за посиланням — /s/<токен>, відкривається без входу й реєстрації.
 */
export function ShareButton({ slug, title, compact }: { slug: string; title: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={compact ? 'ww-share-fab' : 'ww-btn ww-btn-secondary ww-btn-sm'}
        aria-label={`Поділитися лекцією «${title}»`}
        title="Поділитися"
      >
        <ShareIcon />
        {!compact && <span>Поділитися</span>}
      </button>
      {open && createPortal(<ShareDialog slug={slug} title={title} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function ShareDialog({ slug, title, onClose }: { slug: string; title: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('student');
  const [data, setData] = useState<{ link: string | null; students: Student[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/learn/share?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setData(d))
      .catch(() => alive && setErr('Не вдалося завантажити учнів. Оновіть сторінку й спробуйте ще раз.'));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const url = data?.link && typeof window !== 'undefined' ? `${window.location.origin}${data.link}` : '';
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data?.students ?? []).filter((s) => !n || s.name.toLowerCase().includes(n));
  }, [data, q]);

  async function toggle(s: Student) {
    setBusy(s.id);
    setErr(null);
    const on = !s.lesson;
    const r = await fetch('/api/learn/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, studentId: s.id, on }),
    }).catch(() => null);
    setBusy(null);
    if (!r?.ok) return setErr('Не вдалося зберегти. Спробуйте ще раз.');
    setData((d) => d && { ...d, students: d.students.map((x) => (x.id === s.id ? { ...x, lesson: on } : x)) });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const i = boxRef.current?.querySelector<HTMLInputElement>('#ww-share-url');
      i?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="ww-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={boxRef} className="ww-modal-box" role="dialog" aria-modal="true" aria-labelledby="ww-share-title">
        <div className="flex items-start justify-between gap-4 border-b border-ink-line px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 id="ww-share-title" className="font-display text-xl text-paper">
              Поділитися лекцією
            </h2>
            <p className="truncate text-sm text-paper-muted">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="ww-btn ww-btn-ghost ww-btn-sm" aria-label="Закрити">
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-3" role="tablist">
          {(
            [
              ['student', 'Учню'],
              ['link', 'За посиланням'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === k ? 'bg-paper text-ink-raised' : 'text-paper-muted hover:bg-ink-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'student' ? (
          <div className="px-5 pb-5 pt-3">
            <p className="mb-3 text-sm text-paper-muted">Лекція одразу з’явиться в розділі «Курс» учня.</p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Знайти учня"
              className="mb-3 w-full rounded-xl border border-ink-line bg-ink-raised px-3 py-2 text-sm outline-none focus:border-gold"
            />
            <div className="max-h-[46vh] overflow-y-auto pr-1">
              {!data && !err && <p className="py-6 text-center text-sm text-paper-muted">Завантажую учнів…</p>}
              {data && list.length === 0 && (
                <p className="py-6 text-center text-sm text-paper-muted">
                  {data.students.length ? 'Нікого не знайдено.' : 'Ще немає учнів з акаунтом. Надішліть посилання.'}
                </p>
              )}
              <ul className="space-y-1">
                {list.map((s) => {
                  const has = s.lesson || s.viaCourse;
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-ink-soft">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-paper">{s.name}</span>
                        <span className="block text-xs text-paper-muted">
                          {s.done ? 'пройдено разом' : s.viaCourse ? 'відкрито через курс' : s.lesson ? 'відкрито' : 'ще не відкрито'}
                        </span>
                      </span>
                      {s.viaCourse && !s.lesson ? (
                        <span className="text-xs font-medium text-correct">✓ курс</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === s.id}
                          onClick={() => void toggle(s)}
                          className={`ww-btn ww-btn-sm ${has ? 'ww-btn-success' : 'ww-btn-primary'}`}
                        >
                          {busy === s.id ? '…' : s.lesson ? '✓ Відкрито' : 'Відкрити'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 pt-3">
            <p className="mb-3 text-sm text-paper-muted">
              Будь-хто з цим посиланням відкриє лекцію й домашку без входу та реєстрації. Відповіді у вправах збережуться, лише
              якщо учень увійде в акаунт.
            </p>
            {data && !data.link ? (
              <p className="rounded-xl bg-ink-soft px-3 py-2 text-sm text-incorrect">Посилання вимкнені: на сервері не задано секрет SHARE_SECRET.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    id="ww-share-url"
                    readOnly
                    value={url || 'Готую посилання…'}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-xl border border-ink-line bg-ink-soft px-3 py-2 text-sm text-paper"
                  />
                  <button type="button" disabled={!url} onClick={() => void copy()} className="ww-btn ww-btn-primary ww-btn-sm">
                    {copied ? 'Скопійовано ✓' : 'Копіювати'}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="ww-btn ww-btn-ghost ww-btn-sm">
                      Відкрити як учень
                    </a>
                  )}
                  {url && typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      type="button"
                      className="ww-btn ww-btn-ghost ww-btn-sm"
                      onClick={() => void navigator.share({ title, url }).catch(() => {})}
                    >
                      Надіслати…
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {err && <p className="px-5 pb-4 text-sm text-incorrect">{err}</p>}
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

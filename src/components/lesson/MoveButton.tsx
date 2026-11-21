'use client';

import { useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';
import { useT } from '@/i18n/client';

export type CourseOption = { code: string; title: string };

const NEW = '__new__';
const NONE = '__none__';

/**
 * «Перенести» (лише викладач): лекцію можна перенести в іншу категорію (курс) або в нову.
 * Зберігається в lecture_course (міграція 0018) і одразу видно на сайті; учням, яким відкрито
 * категорію, лекція з'являється чи зникає разом із нею.
 */
export function MoveButton({ slug, title, options, currentCode }: { slug: string; title: string; options: CourseOption[]; currentCode: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const targets = options.filter((o) => o.code && o.code !== currentCode);

  async function save() {
    if (!choice) return;
    setBusy(true);
    setErr(null);
    const known = options.find((o) => o.code === choice);
    const payload =
      choice === NONE
        ? { slug, module: '' }
        : choice === NEW
          ? { slug, module: 'new', moduleTitle: newTitle }
          : { slug, module: choice, moduleTitle: known?.title ?? '' };
    const r = await fetch('/api/learn/course', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    const d = (await r?.json().catch(() => null)) as { error?: string } | null;
    setErr(d?.error === 'no_table' ? t('Перенесення ще не ввімкнено в базі (потрібна міграція 0018).') : t('Не вдалося. Спробуйте ще раз.'));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="ww-share-fab"
        aria-label={t('Перенести лекцію «{title}» в іншу категорію', { title })}
        title={t('Перенести в іншу категорію')}
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <path d="M10 13h6m-2.5-2.5L16 13l-2.5 2.5" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-10 z-30 w-64 rounded-xl border border-ink-line bg-ink-raised p-3 text-left shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-sm font-medium text-paper">{t('Куди перенести?')}</p>
          <select
            className="ww-live-select mb-2 w-full"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            aria-label={t('Куди перенести?')}
          >
            <option value="">{t('Оберіть категорію…')}</option>
            {targets.map((o) => (
              <option key={o.code} value={o.code}>
                {o.title}
              </option>
            ))}
            {currentCode !== '' && <option value={NONE}>{t('Без курсу')}</option>}
            <option value={NEW}>{t('＋ Нова категорія…')}</option>
          </select>
          {choice === NEW && (
            <input
              className="ww-live-select mb-2 w-full"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('Назва нової категорії')}
              maxLength={120}
              autoFocus
            />
          )}
          {err && <p className="mb-2 text-sm text-incorrect">{err}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className="ww-btn ww-btn-secondary ww-btn-sm"
              disabled={busy || !choice || (choice === NEW && !newTitle.trim())}
              onClick={() => void save()}
            >
              {busy ? '…' : t('Перенести')}
            </button>
            <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => setOpen(false)}>
              {t('Скасувати')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

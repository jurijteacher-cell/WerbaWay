'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n/config';
import { setLocale } from '@/i18n/actions';
import { useLocale, useT } from '@/i18n/client';

/**
 * Перемикач мови інтерфейсу й пояснень у лекціях.
 * Мітки текстові: прапор не дорівнює мові (а для російської ще й хибний).
 */
export function LangSwitch({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    start(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        className="ww-btn ww-btn-ghost ww-btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Мова інтерфейсу')}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🌐</span>
        <span>{LOCALE_LABEL[locale].short}</span>
      </button>

      {open && (
        <div className="ww-menu" role="menu">
          <span className="ww-menu-label px-2 pb-1">{t('Мова інтерфейсу')}</span>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              className="ww-menu-row text-left"
              onClick={() => pick(l)}
            >
              <span className="font-medium">{LOCALE_LABEL[l].full}</span>
              <span className="ww-menu-label">{l === locale ? '✓' : LOCALE_LABEL[l].short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

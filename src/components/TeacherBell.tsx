'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type Item = { kind: 'hw' | 'bug'; id: string; studentId: string; name: string; title: string; at: string; href: string };

const SEEN_KEY = 'ww.hwSeenAt';

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/** «5 хв тому», «вчора 19:40» — коротко, щоб влізло в рядок */
function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'щойно';
  if (mins < 60) return `${mins} хв тому`;
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  if (today) return `сьогодні ${time}`;
  const yesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString();
  if (yesterday) return `вчора ${time}`;
  return `${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} ${time}`;
}

/**
 * Дзвіночок викладача: показує, хто здав домашку.
 * Позначка «переглянуто» зберігається в цьому браузері (без зміни бази),
 * тож на іншому пристрої лічильник почнеться заново.
 */
export function TeacherBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [seen, setSeen] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/teacher/notifications', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { items?: Item[] };
      setItems(j.items ?? []);
    } catch {
      /* мережа впала — спробуємо наступного разу */
    }
  }, []);

  useEffect(() => {
    setSeen(readSeen());
    load();
    const t = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fresh = items.filter((i) => i.at > seen);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items.length) {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(SEEN_KEY, now);
      } catch {
        /* приватний режим — лічильник просто не запам'ятається */
      }
      // лишаємо поточні як «нові» до закриття, щоб було видно, що саме прийшло
      setTimeout(() => setSeen(now), 400);
    }
  }

  return (
    <div ref={box} className="ww-bell-wrap">
      <button
        type="button"
        onClick={toggle}
        className="ww-bell"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={fresh.length ? `Домашки: ${fresh.length} нових` : 'Домашки'}
        title="Здані домашки"
      >
        <span aria-hidden="true">🔔</span>
        {fresh.length > 0 && <span className="ww-bell-dot">{fresh.length > 9 ? '9+' : fresh.length}</span>}
      </button>

      {open && (
        <div className="ww-menu ww-bell-menu" role="menu">
          <p className="ww-bell-head">Домашки й повідомлення про помилки</p>
          {items.length === 0 && <p className="ww-bell-empty">Поки нічого. Тут з&apos;являтимуться здані домашки й повідомлення про помилки.</p>}
          {items.slice(0, 12).map((i) => (
            <Link
              key={i.id}
              href={i.href}
              onClick={() => setOpen(false)}
              className={`ww-bell-row${i.at > seen ? ' is-new' : ''}`}
            >
              <span className="ww-bell-name">
                {i.kind === 'bug' ? '⚑ ' : '✅ '}
                {i.name}
              </span>
              <span className="ww-bell-lesson">{i.title}</span>
              <span className="ww-bell-when">{when(i.at)}</span>
            </Link>
          ))}
          {items.length > 0 && (
            <Link href="/teacher/students" onClick={() => setOpen(false)} className="ww-bell-all">
              Усі учні →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

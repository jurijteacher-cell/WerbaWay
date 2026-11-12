'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Item = { title: string; sub?: string; href: string; icon: string };
type Group = { label: string; items: Item[] };

/** Глобальний пошук: кнопка в шапці, Ctrl/⌘+K або «/» відкривають палітру */
export function SearchPalette({ teacher }: { teacher: boolean }) {
  const [open, setOpen] = useState(false);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ww-search-trigger"
        aria-label="Пошук по сайту"
        aria-keyshortcuts="Control+K Meta+K /"
      >
        <SearchIcon />
        <span className="hidden md:inline">{teacher ? 'Учень, лекція, слово…' : 'Лекція, слово…'}</span>
        <kbd className="hidden md:inline">{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      {open && createPortal(<Palette teacher={teacher} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function Palette({ teacher, onClose }: { teacher: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // запит із затримкою; відповіді, що запізнилися, ігноруються
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(
      () => {
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((r) => (r.ok ? r.json() : { groups: [] }))
          .then((d: { groups: Group[] }) => {
            if (id !== seq.current) return;
            setGroups(d.groups ?? []);
            setActive(0);
            setLoading(false);
          })
          .catch(() => id === seq.current && (setGroups([]), setLoading(false)));
      },
      q ? 160 : 0
    );
    return () => clearTimeout(t);
  }, [q]);

  const flat = useMemo(() => (groups ?? []).flatMap((g) => g.items), [groups]);

  const go = useCallback(
    (it: Item | undefined) => {
      if (!it) return;
      onClose();
      router.push(it.href);
    },
    [onClose, router]
  );

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    }
  }

  let i = -1;
  return (
    <div className="ww-modal ww-modal-top" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ww-modal-box !max-w-[640px]" role="dialog" aria-modal="true" aria-label="Пошук по сайту" onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-ink-line px-4 py-3">
          <SearchIcon />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={teacher ? 'Знайти учня, лекцію, курс, слово…' : 'Знайти лекцію, курс, слово…'}
            className="min-w-0 flex-1 bg-transparent text-base text-paper outline-none placeholder:text-paper-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="ww-search-list"
            aria-activedescendant={flat.length ? `ww-s-${active}` : undefined}
          />
          {loading && <span className="text-xs text-paper-muted">шукаю…</span>}
          <kbd className="ww-kbd">Esc</kbd>
        </div>
        <div ref={listRef} id="ww-search-list" role="listbox" className="max-h-[58vh] overflow-y-auto px-2 py-2">
          {groups && flat.length === 0 && !loading && (
            <p className="px-3 py-8 text-center text-sm text-paper-muted">
              Нічого не знайдено за «{q}». Спробуйте інше слово або частину назви.
            </p>
          )}
          {(groups ?? []).map((g) => (
            <div key={g.label} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-gold-dim">{g.label}</p>
              {g.items.map((it) => {
                i += 1;
                const n = i;
                return (
                  <button
                    key={`${g.label}-${it.href}-${it.title}`}
                    id={`ww-s-${n}`}
                    data-i={n}
                    type="button"
                    role="option"
                    aria-selected={n === active}
                    onMouseMove={() => setActive(n)}
                    onClick={() => go(it)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                      n === active ? 'bg-[#fff3b8]' : ''
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ink-line bg-ink-raised text-base" aria-hidden="true">
                      {it.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-paper">{it.title}</span>
                      {it.sub && <span className="block truncate text-xs text-paper-muted">{it.sub}</span>}
                    </span>
                    {n === active && <kbd className="ww-kbd">↵</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex gap-4 border-t border-ink-line px-4 py-2 text-xs text-paper-muted">
          <span>
            <kbd className="ww-kbd">↑</kbd> <kbd className="ww-kbd">↓</kbd> вибрати
          </span>
          <span>
            <kbd className="ww-kbd">↵</kbd> відкрити
          </span>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

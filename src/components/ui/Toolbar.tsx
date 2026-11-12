'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export type ToolbarItem = {
  id: string;
  /** Підпис для меню «Ще», коли кнопка не влізла в рядок */
  label: string;
  /** Вигляд у самому рядку */
  node: ReactNode;
  /** Вигляд у меню «Ще»; якщо не задано — той самий node */
  menuNode?: ReactNode;
};

/**
 * Панель інструментів, з якої нічого не зникає: усе, що не влізло у ширину,
 * ховається в меню «Ще» праворуч. Ширини міряються на прихованому дублі рядка,
 * тож кількість видимих кнопок перераховується на кожну зміну розміру вікна.
 */
export function Toolbar({ items, className = '' }: { items: ToolbarItem[]; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(items.length);
  const [open, setOpen] = useState(false);

  const recalc = useCallback(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;
    const avail = wrap.clientWidth;
    const kids = Array.from(measure.children) as HTMLElement[];
    const GAP = 8;
    const MORE = 96; // місце під кнопку «Ще»
    let used = 0;
    let n = 0;
    for (const kid of kids) {
      const need = kid.offsetWidth + (n ? GAP : 0);
      const reserve = n < kids.length - 1 ? GAP + MORE : 0;
      if (used + need + reserve > avail) break;
      used += need;
      n += 1;
    }
    setFit(n);
  }, []);

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(() => recalc());
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (measureRef.current) ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, [recalc, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hidden = items.slice(fit);

  return (
    <div ref={wrapRef} className={`ww-toolbar ${className}`}>
      {/* прихований дубль: лише для вимірювання природної ширини кнопок */}
      <div ref={measureRef} className="ww-toolbar-measure" aria-hidden="true">
        {items.map((it) => (
          <div key={it.id}>{it.node}</div>
        ))}
      </div>

      {items.slice(0, fit).map((it) => (
        <div key={it.id} className="ww-toolbar-item">
          {it.node}
        </div>
      ))}

      {hidden.length > 0 && (
        <div ref={moreRef} className="ww-toolbar-more">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={`ww-btn ww-btn-sm ${open ? 'ww-btn-accent' : 'ww-btn-secondary'}`}
          >
            Ще
            <span className="ww-toolbar-count">{hidden.length}</span>
          </button>
          {open && (
            <div className="ww-menu" role="menu">
              {hidden.map((it) => (
                <div key={it.id} className="ww-menu-row" onClick={() => setOpen(false)}>
                  <span className="ww-menu-label">{it.label}</span>
                  {it.menuNode ?? it.node}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

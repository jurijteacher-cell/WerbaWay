'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type NavItem = { href: string; label: string; exact?: boolean };

// на сервері useLayoutEffect не працює — там достатньо звичайного
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const GAP = 4; // gap-1 між пунктами
const PAD = 10; // p-1 рамки + межа
const MORE = 78; // місце під кнопку «Ще ▾»

/**
 * Пункти меню: окремі кнопки, поточна сторінка підсвічена.
 * З меню нічого не зникає (docs/DESIGN_SYSTEM.md, Toolbar): що не влізло в ширину,
 * іде в «Ще» праворуч. Ширини міряються на прихованому дублі, перерахунок — на кожну зміну розміру.
 */
export function NavLinks({ items }: { items: NavItem[] }) {
  const t = useT();
  const path = usePathname() ?? '/';
  const isOn = (it: NavItem) => (it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`));
  // якщо підходить кілька пунктів (/teacher і /teacher/class) — підсвічуємо найдовший
  const active = items.filter(isOn).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(items.length);
  const [open, setOpen] = useState(false);

  const recalc = useCallback(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;
    const avail = wrap.clientWidth - PAD;
    const widths = (Array.from(measure.children) as HTMLElement[]).map((el) => el.offsetWidth);
    const total = widths.reduce((s, w, i) => s + w + (i ? GAP : 0), 0);
    if (total <= avail) return setFit(widths.length);
    let used = 0;
    let n = 0;
    for (const w of widths) {
      const need = w + (n ? GAP : 0);
      if (used + need + GAP + MORE > avail) break;
      used += need;
      n += 1;
    }
    setFit(n);
  }, []);

  useIsoLayoutEffect(() => {
    recalc();
    const ro = new ResizeObserver(() => recalc());
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (measureRef.current) ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, [recalc, items.length]);

  // меню «Ще»: закривається кліком поза ним, Esc і переходом на іншу сторінку
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
  useEffect(() => setOpen(false), [path]);

  const shown = items.slice(0, fit);
  const hidden = items.slice(fit);
  const hiddenActive = hidden.some((it) => it.href === active);

  return (
    <div ref={wrapRef} className="relative flex min-w-0 flex-1 justify-end">
      {/* прихований дубль: лише для вимірювання природної ширини пунктів */}
      <div ref={measureRef} className="ww-nav-measure" aria-hidden="true">
        {items.map((it) => (
          <span key={it.href} className="ww-nav-link">
            {it.label}
          </span>
        ))}
      </div>

      <nav aria-label={t("Головне меню")} className="ww-nav min-w-0">
        {/* overflow-hidden — лише запобіжник до першого виміру; меню «Ще» лежить поза ним */}
        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          {shown.map((it) => (
            <Link key={it.href} href={it.href} className="ww-nav-link" aria-current={it.href === active ? 'page' : undefined}>
              {it.label}
            </Link>
          ))}
        </div>
        {hidden.length > 0 && (
          <div ref={moreRef} className="relative flex-none">
            <button
              type="button"
              className="ww-nav-link"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-current={hiddenActive ? 'page' : undefined}
            >
              {t("Ще")}
              <span aria-hidden="true">{open ? '▴' : '▾'}</span>
            </button>
            {open && (
              <div className="ww-menu" role="menu">
                {hidden.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    role="menuitem"
                    className="ww-menu-link"
                    aria-current={it.href === active ? 'page' : undefined}
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}

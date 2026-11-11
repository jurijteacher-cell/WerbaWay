'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Item = { id: string; label: string; num: string | null };

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Зміст лекції в окремій рамці.
 * Широкий екран: липка картка праворуч — жовта підсвітка плавно їде за поточним розділом,
 * смужка вгорі показує, скільки лекції прочитано, пройдені розділи отримують галочку.
 * Вузький екран: горизонтальна стрічка, поточний розділ сам прокручується в поле зору.
 */
export function LessonOutline({ items, variant = 'rail' }: { items: Item[]; variant?: 'rail' | 'strip' }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // який розділ зараз читається + скільки прочитано
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const article = els[0].closest('article');
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.33;
      let cur = 0;
      els.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) cur = i;
      });
      setActive(cur);
      if (article) {
        const r = article.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.5;
        const done = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, total)));
        setProgress(done);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  // підсвітка-«маркер» під активним пунктом
  useIsoLayout(() => {
    if (variant !== 'rail') return;
    const a = linkRefs.current[active];
    if (a) setPill({ top: a.offsetTop, height: a.offsetHeight });
  }, [active, variant, items]);

  // у стрічці на телефоні — підкрутити активний пункт у поле зору
  useEffect(() => {
    if (variant !== 'strip') return;
    const a = linkRefs.current[active];
    const list = listRef.current;
    if (!a || !list) return;
    const left = a.offsetLeft - list.clientWidth / 2 + a.clientWidth / 2;
    list.scrollTo({ left, behavior: 'smooth' });
  }, [active, variant]);

  const pct = Math.round(progress * 100);

  return (
    <nav className={`lp-outline lp-outline-${variant}`} aria-label="Зміст лекції">
      {variant === 'rail' && (
        <div className="lp-outline-head">
          <span className="lp-outline-title">Зміст</span>
          <span className="lp-outline-pct" aria-label={`прочитано ${pct}%`}>
            {pct}%
          </span>
        </div>
      )}
      <div className="lp-outline-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <ol ref={listRef}>
        {variant === 'rail' && pill && (
          <li
            aria-hidden="true"
            className="lp-outline-pill"
            style={{ transform: `translateY(${pill.top}px)`, height: pill.height }}
          />
        )}
        {items.map((it, i) => {
          const passed = i < active;
          const here = i === active;
          return (
            <li key={it.id}>
              <a
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                href={`#${it.id}`}
                aria-current={here ? 'location' : undefined}
                data-passed={passed || undefined}
              >
                <span className="lp-outline-num">
                  <span className="lp-outline-n">{it.num ?? '•'}</span>
                  <span className="lp-outline-check" aria-hidden="true">
                    ✓
                  </span>
                </span>
                <span className="lp-outline-label">{it.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

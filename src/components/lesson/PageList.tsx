'use client';

import { useT } from '@/i18n/client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { BookPage } from '@/lib/pages/pages';
import { CheckMark, PageIcon, iconForSection, pageIcon } from './PageIcon';

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** скільки сторінок ще показуємо сегментами; більше — суцільна смужка */
const MAX_SEGMENTS = 36;

type Rail = { pill: { top: number; height: number }; top: number; height: number; fill: number };

/**
 * Список сторінок лекції — шкала: вузли розділів з номерами, під ними сторінки з лінійними іконками.
 * Лінія прогресу заповнюється до поточної сторінки, пройдені вузли стають фіолетовими з галочкою.
 * Без `go` список лише показує, де учень зараз.
 */
export function PageList({
  pages,
  idx,
  visited,
  go,
  compact,
  strict,
}: {
  pages: BookPage[];
  idx: number;
  visited: Set<number>;
  go?: (n: number) => void;
  compact?: boolean;
  /** «пройдено» — лише позначене кнопкою (не все, що лишилось позаду поточної сторінки) */
  strict?: boolean;
}) {
  const t = useT();
  const bodyRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [rail, setRail] = useState<Rail | null>(null);

  useIsoLayout(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => {
      const base = body.getBoundingClientRect().top;
      const nodes = body.querySelectorAll<HTMLElement>('.lp-rail-node');
      const cur = itemRefs.current[idx];
      if (!nodes.length || !cur) return;
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.top - base + r.height / 2;
      };
      const first = centre(nodes[0]);
      const last = centre(nodes[nodes.length - 1]);
      const here = cur.querySelector('.lp-rail-node');
      setRail({
        pill: { top: cur.offsetTop, height: cur.offsetHeight },
        top: first,
        height: Math.max(0, last - first),
        fill: here ? Math.max(0, centre(here) - first) : 0,
      });
    };
    measure();
    // шрифт довантажився або змінилась ширина — рядки переносяться інакше
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(body);
    return () => ro?.disconnect();
  }, [idx, pages]);

  // групи розділів
  const groups: { title: string; num: string | null; items: number[] }[] = [];
  pages.forEach((p, i) => {
    const g = groups[groups.length - 1];
    if (g && g.title === p.section && g.num === p.num) g.items.push(i);
    else groups.push({ title: p.section, num: p.num, items: [i] });
  });

  const done = (i: number) => i !== idx && visited.has(i);
  const label = (p: BookPage) => (p.kind === 'text' ? t(p.label) : p.label);
  let order = 0; // порядок появи рядків
  const appear = (): CSSProperties => ({ ['--i' as string]: Math.min(order++, 16) });

  const railStyle = rail
    ? ({ ['--rail-top' as string]: `${rail.top}px`, ['--rail-h' as string]: `${rail.height}px`, ['--rail-fill' as string]: `${rail.fill}px` } as CSSProperties)
    : undefined;

  return (
    <div className={`lp-outline lp-outline-rail lp-pagelist${compact ? ' is-compact' : ''}`}>
      {!compact && (
        <>
          <div className="lp-outline-head">
            <span className="lp-outline-title">{t('Сторінки')}</span>
            <span className="lp-outline-pct">
              <b>{idx + 1}</b> / {pages.length}
            </span>
          </div>
          {pages.length <= MAX_SEGMENTS ? (
            <div className="lp-rail-segs" aria-hidden="true">
              {pages.map((p, i) => (
                <span key={p.key} data-state={i === idx ? 'here' : done(i) || (!strict && i < idx) ? 'done' : undefined} />
              ))}
            </div>
          ) : (
            <div className="lp-outline-bar" aria-hidden="true">
              <span style={{ transform: `scaleX(${(idx + 1) / pages.length})` }} />
            </div>
          )}
        </>
      )}
      <div ref={bodyRef} className={`lp-pagelist-body${rail ? ' is-measured' : ''}`} style={railStyle}>
        <span aria-hidden="true" className="lp-rail-track" />
        <span aria-hidden="true" className="lp-rail-fill" />
        {rail && (
          <span
            aria-hidden="true"
            className="lp-outline-pill"
            style={{ transform: `translateY(${rail.pill.top}px)`, height: rail.pill.height }}
          />
        )}
        {groups.map((g) => {
          const single = g.items.length === 1;
          const secIcon = iconForSection(g.title);
          const hasHere = g.items.includes(idx);
          const allDone = g.items.every(done);
          return (
            <div key={`${g.num ?? ''}${g.title}`} className="lp-pagelist-group">
              {!single && (
                <p
                  className="lp-pagelist-section"
                  data-here={hasHere || undefined}
                  data-passed={allDone || undefined}
                  style={appear()}
                >
                  <span className="lp-rail-node is-section">
                    {g.num ? (
                      <span className="lp-rail-glyph lp-rail-numtxt">{g.num}</span>
                    ) : (
                      <PageIcon className="lp-rail-glyph" name={secIcon ?? pageIcon(pages[g.items[0]])} />
                    )}
                    <CheckMark />
                  </span>
                  <span className="lp-rail-text">{g.title}</span>
                </p>
              )}
              {g.items.map((i) => {
                const p = pages[i];
                const here = i === idx;
                const cls = single ? 'lp-pagelist-item is-top' : 'lp-pagelist-item';
                const body = (
                  <>
                    <span className={`lp-rail-node${single ? ' is-section' : ''}`}>
                      {single && g.num ? (
                        <span className="lp-rail-glyph lp-rail-numtxt">{g.num}</span>
                      ) : (
                        <PageIcon className="lp-rail-glyph" name={single ? secIcon ?? pageIcon(p) : pageIcon(p)} />
                      )}
                      <CheckMark />
                    </span>
                    <span className="lp-outline-label lp-rail-text">{single ? g.title : label(p)}</span>
                  </>
                );
                const ref = (el: HTMLElement | null) => {
                  itemRefs.current[i] = el;
                };
                const common = {
                  ref,
                  'aria-current': here ? ('page' as const) : undefined,
                  'data-passed': done(i) || undefined,
                  style: appear(),
                };
                return go ? (
                  <button key={p.key} {...common} type="button" onClick={() => go(i)} className={cls}>
                    {body}
                  </button>
                ) : (
                  <div key={p.key} {...common} className={`${cls} is-static`}>
                    {body}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

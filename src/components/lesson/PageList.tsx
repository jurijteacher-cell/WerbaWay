'use client';


import { useT } from '@/i18n/client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BookPage } from '@/lib/pages/pages';
import { FRAME_TAG } from '@/lib/class/protocol';

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const PAGE_ICON: Record<string, string> = {
  goal: '🎯',
  text: '📖',
  exam: '📝',
  'comm-tasks': '💬',
  slides: '🖼️',
  grammar: '✏️',
  hw: '🏠',
  vocab: '🔤',
  'grammar-board': '✏️',
  notes: '🗒️',
  pictures: '🖼️',
  'mock-exam': '📝',
  placement: '🎯',
  quizlet: '🔤',
  video: '▶️',
  other: '🧩',
};

/**
 * Список сторінок лекції, згрупований за розділами; маркер плавно їде до поточної сторінки.
 * Без `go` список лише показує, де учень зараз (у класі сторінки гортає викладач).
 */
export function PageList({
  pages,
  idx,
  visited,
  go: goProp,
  compact,
  classNav,
}: {
  pages: BookPage[];
  idx: number;
  visited: Set<number>;
  go?: (n: number) => void;
  compact?: boolean;
  /** у класі: клік просить викладача відкрити цю сторінку (обом одразу) */
  classNav?: boolean;
}) {
  const t = useT();
  const go = classNav
    ? (n: number) => {
        try {
          window.parent.postMessage({ ww: FRAME_TAG, k: 'go', url: pages[n].url }, window.location.origin);
        } catch {
          /* не в класі — нічого не робимо */
        }
      }
    : goProp;
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);

  useIsoLayout(() => {
    const b = itemRefs.current[idx];
    if (b) setPill({ top: b.offsetTop, height: b.offsetHeight });
  }, [idx, pages]);

  // групи розділів
  const groups: { title: string; num: string | null; items: number[] }[] = [];
  pages.forEach((p, i) => {
    const g = groups[groups.length - 1];
    if (g && g.title === p.section) g.items.push(i);
    else groups.push({ title: p.section, num: p.num, items: [i] });
  });

  const pct = Math.round(((idx + 1) / pages.length) * 100);
  return (
    <div className={`lp-outline lp-outline-rail lp-pagelist${compact ? ' is-compact' : ''}`}>
      {!compact && (
        <>
          <div className="lp-outline-head">
            <span className="lp-outline-title">{t("Сторінки")}</span>
            <span className="lp-outline-pct">
              {idx + 1} з {pages.length}
            </span>
          </div>
          <div className="lp-outline-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
        </>
      )}
      <div ref={listRef} className="lp-pagelist-body">
        {pill && (
          <span
            aria-hidden="true"
            className="lp-outline-pill"
            style={{ transform: `translateY(${pill.top}px)`, height: pill.height }}
          />
        )}
        {groups.map((g) => {
          const single = g.items.length === 1;
          return (
            <div key={g.title} className="lp-pagelist-group">
              {!single && (
                <p className="lp-pagelist-section">
                  <span className="lp-outline-num">{g.num ?? '·'}</span>
                  <span>{g.title}</span>
                </p>
              )}
              {g.items.map((i) => {
                const p = pages[i];
                const here = i === idx;
                const seen = visited.has(i) && !here;
                const cls = single ? 'lp-pagelist-item is-top' : 'lp-pagelist-item';
                const body = (
                  <>
                    <span className="lp-outline-num">
                      <span className="lp-outline-n">{single ? g.num ?? PAGE_ICON[p.kind] : PAGE_ICON[p.kind] ?? '•'}</span>
                      <span className="lp-outline-check" aria-hidden="true">
                        ✓
                      </span>
                    </span>
                    <span className="lp-outline-label">{single ? g.title : p.label}</span>
                  </>
                );
                const ref = (el: HTMLElement | null) => {
                  itemRefs.current[i] = el;
                };
                return go ? (
                  <button
                    key={p.key}
                    ref={ref}
                    type="button"
                    onClick={() => go(i)}
                    aria-current={here ? 'page' : undefined}
                    data-passed={seen || undefined}
                    className={cls}
                  >
                    {body}
                  </button>
                ) : (
                  <div
                    key={p.key}
                    ref={ref}
                    aria-current={here ? 'page' : undefined}
                    data-passed={seen || undefined}
                    className={`${cls} is-static`}
                  >
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

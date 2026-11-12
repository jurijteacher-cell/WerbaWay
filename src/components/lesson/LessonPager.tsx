'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BookPage } from '@/lib/pages/pages';
import { SheetBody } from './LessonBlocks';

const TURN_MS = 760;
const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const ICON: Record<string, string> = {
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

type Turn = { from: number; dir: 'next' | 'prev' };

/**
 * Лекція як блокнот: одна сторінка на екрані, навігація збоку, «Далі» внизу.
 * Перехід — аркуш перегортається навколо корінця (лівого краю); вправи на сторінці, що відлітає,
 * не перезавантажуються (React зберігає той самий елемент за ключем).
 */
export function LessonPager({
  slug,
  pages,
  initial,
  hasHomework,
  base,
  doneHref = '/learn',
}: {
  slug: string;
  /** адреса лекції: /learn/<slug> або публічне /s/<токен> */
  base?: string;
  doneHref?: string | null;
  pages: BookPage[];
  initial: number;
  hasHomework: boolean;
}) {
  const [idx, setIdx] = useState(() => Math.min(Math.max(initial, 0), pages.length - 1));
  const [turn, setTurn] = useState<Turn | null>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([initial]));
  const [listOpen, setListOpen] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeKey = `ww_book_v1|${slug}`;

  // відвідані сторінки — лише зручність на цьому пристрої
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setVisited(new Set([...(JSON.parse(raw) as number[]), idx]));
    } catch {
      /* немає сховища — не страшно */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  const go = useCallback(
    (n: number) => {
      if (n < 0 || n >= pages.length || n === idx) return;
      const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (timer.current) clearTimeout(timer.current);
      setTurn(reduce ? null : { from: idx, dir: n > idx ? 'next' : 'prev' });
      setIdx(n);
      setListOpen(false);
      setVisited((v) => {
        const next = new Set(v).add(n);
        try {
          localStorage.setItem(storeKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('p', String(n + 1));
        window.history.replaceState(null, '', url);
      } catch {
        /* ignore */
      }
      if (!reduce) timer.current = setTimeout(() => setTurn(null), TURN_MS);
      const top = bookRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) bookRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    },
    [idx, pages.length, storeKey]
  );

  // ← → перегортають, якщо фокус не в полі вводу
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, idx]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const page = pages[idx];
  const next = pages[idx + 1];
  const prev = pages[idx - 1];

  // аркуші: поточний у потоці; під час перегортання — ще й попередній (той самий key → iframe не перевантажується)
  const sheets: { i: number; role: 'current' | 'leaving' | 'entering' | 'under' }[] = [];
  if (turn) {
    if (turn.dir === 'next') {
      sheets.push({ i: idx, role: 'current' }, { i: turn.from, role: 'leaving' });
    } else {
      sheets.push({ i: idx, role: 'entering' }, { i: turn.from, role: 'under' });
    }
  } else sheets.push({ i: idx, role: 'current' });
  sheets.sort((a, b) => a.i - b.i); // стабільний порядок у DOM → React не переставляє iframe

  return (
    <div className="lp-pager">
      <aside className="lp-pager-rail" aria-label="Сторінки лекції">
        <PageList pages={pages} idx={idx} visited={visited} go={go} />
      </aside>

      <div className="lp-pager-main">
        {/* телефон: компактна панель гортання */}
        <div className="lp-pagebar">
          <button type="button" onClick={() => go(idx - 1)} disabled={!prev} aria-label="Попередня сторінка">
            ‹
          </button>
          <button type="button" className="lp-pagebar-title" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
            <span className="lp-pagebar-count">
              {idx + 1}/{pages.length}
            </span>
            <span className="lp-pagebar-label">{page.section}</span>
            <span aria-hidden="true">{listOpen ? '▴' : '▾'}</span>
          </button>
          <button type="button" onClick={() => go(idx + 1)} disabled={!next} aria-label="Наступна сторінка">
            ›
          </button>
          <div className="lp-outline-bar lp-pagebar-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(idx + 1) / pages.length})` }} />
          </div>
          {listOpen && (
            <div className="lp-pagebar-list">
              <PageList pages={pages} idx={idx} visited={visited} go={go} compact />
            </div>
          )}
        </div>

        <div ref={bookRef} className={`lp-book${turn ? ' is-turning' : ''}`}>
          {sheets.map(({ i, role }) => (
            <section
              key={pages[i].key}
              className={`lp-sheet is-${role}`}
              aria-hidden={role === 'leaving' || role === 'under' ? true : undefined}
              data-kind={pages[i].kind}
            >
              <SheetBody page={pages[i]} index={i} total={pages.length} />
            </section>
          ))}
        </div>

        <nav className="lp-turn" aria-label="Гортання">
          <button type="button" className="lp-turn-prev" onClick={() => go(idx - 1)} disabled={!prev}>
            <span className="lp-turn-k">Назад</span>
            <span className="lp-turn-t">{prev ? (prev.kind === 'text' || prev.kind === 'goal' ? prev.section : prev.label) : 'Початок'}</span>
          </button>
          {next ? (
            <button type="button" className="lp-turn-next" onClick={() => go(idx + 1)}>
              <span className="lp-turn-k">Далі</span>
              <span className="lp-turn-t">{next.kind === 'text' || next.kind === 'goal' ? next.section : next.label}</span>
            </button>
          ) : hasHomework ? (
            <Link href={`${base ?? `/learn/${slug}`}/hw`} className="lp-turn-next">
              <span className="lp-turn-k">Лекцію завершено</span>
              <span className="lp-turn-t">Перейти до домашнього завдання</span>
            </Link>
          ) : doneHref ? (
            <Link href={doneHref} className="lp-turn-next">
              <span className="lp-turn-k">Лекцію завершено</span>
              <span className="lp-turn-t">До списку уроків</span>
            </Link>
          ) : (
            <span className="lp-turn-next" aria-disabled="true">
              <span className="lp-turn-k">Лекцію завершено</span>
              <span className="lp-turn-t">Dziękuję! Дякуємо!</span>
            </span>
          )}
        </nav>
      </div>
    </div>
  );
}

/** Список сторінок, згрупований за розділами; маркер плавно їде до поточної сторінки */
function PageList({
  pages,
  idx,
  visited,
  go,
  compact,
}: {
  pages: BookPage[];
  idx: number;
  visited: Set<number>;
  go: (n: number) => void;
  compact?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
            <span className="lp-outline-title">Сторінки</span>
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
                return (
                  <button
                    key={p.key}
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => go(i)}
                    aria-current={here ? 'page' : undefined}
                    data-passed={seen || undefined}
                    className={single ? 'lp-pagelist-item is-top' : 'lp-pagelist-item'}
                  >
                    <span className="lp-outline-num">
                      <span className="lp-outline-n">{single ? g.num ?? ICON[p.kind] : ICON[p.kind] ?? '•'}</span>
                      <span className="lp-outline-check" aria-hidden="true">
                        ✓
                      </span>
                    </span>
                    <span className="lp-outline-label">{single ? g.title : p.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookPage } from '@/lib/pages/pages';
import { SheetBody } from './LessonBlocks';
import { PageList } from './PageList';

const TURN_MS = 760;

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

'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BookPage } from '@/lib/pages/pages';
import { createClient } from '@/lib/supabase/client';
import { SheetBody } from './LessonBlocks';
import { PageList } from './PageList';
import { WrittenAnswer, needsWriting } from './WrittenAnswer';

type Dir = 'next' | 'prev';

/**
 * Лекція як блокнот: одна сторінка на екрані, навігація збоку, «Далі» внизу.
 * Перехід: старий аркуш зникає одразу, сторінка без прокрутки-анімації стає на початок блокнота,
 * новий аркуш з'являється коротким зсувом у бік гортання (0.28s). Жодних двох аркушів одночасно:
 * 3D-перегортання високого аркуша разом із плавною прокруткою виглядало як збій.
 */
export function LessonPager({
  slug,
  pages,
  initial,
  hasHomework,
  base,
  doneHref = '/learn',
  watch = false,
  onPage,
  progress,
}: {
  /**
   * Прогрес учня з акаунтом: сторінка вважається пройденою лише після кнопки «Пройдено».
   * Без нього (гість за посиланням, викладач, «Дивитися») лишається проста відмітка відвіданих.
   */
  progress?: { done: string[] };
  /** режим «Дивитися учня»: вправи лише показують відповіді учня; відвідані/URL/маячок не чіпаємо */
  watch?: boolean;
  /** викликається, коли сторінку перегорнули в самому блокноті */
  onPage?: (i: number) => void;
  slug: string;
  /** адреса лекції: /learn/<slug> або публічне /s/<токен> */
  base?: string;
  doneHref?: string | null;
  pages: BookPage[];
  initial: number;
  hasHomework: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const tracked = !!progress && !watch;
  const [idx, setIdx] = useState(() => Math.min(Math.max(initial, 0), pages.length - 1));
  const [dir, setDir] = useState<Dir | null>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([initial]));
  const [listOpen, setListOpen] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const storeKey = `ww_book_v1|${slug}`;
  const [doneKeys, setDoneKeys] = useState<Set<string>>(() => new Set(progress?.done ?? []));
  /** сторінки, які учень свідомо пропустив у цьому візиті — повторно не питаємо */
  const skippedRef = useRef<Set<string>>(new Set());
  const [leave, setLeave] = useState<{ to: number } | { href: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [markErr, setMarkErr] = useState<string | null>(null);
  const [hwNew, setHwNew] = useState(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

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

  // «Дивитися учня»: маячок (LiveBeacon) повідомляє викладачеві, на якій сторінці учень
  useEffect(() => {
    if (watch) return;
    window.dispatchEvent(new CustomEvent('ww:lesson-page', { detail: idx }));
  }, [idx, watch]);

  const doGo = useCallback(
    (n: number) => {
      if (n < 0 || n >= pages.length || n === idx) return;
      setDir(n > idx ? 'next' : 'prev');
      setIdx(n);
      setListOpen(false);
      onPage?.(n);
      if (watch) return;
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
      // на початок нової сторінки — миттєво: плавна прокрутка разом зі зміною аркуша смикає екран
      const book = bookRef.current;
      if (book) {
        const top = book.getBoundingClientRect().top;
        // на вузьких екранах над аркушем прилипає панель гортання — лишаємо під неї місце
        const bar = book.parentElement?.querySelector<HTMLElement>('.lp-pagebar');
        const sticky = bar && bar.offsetParent ? bar.offsetHeight + 24 : 16;
        if (top < sticky) window.scrollTo({ top: window.scrollY + top - sticky, behavior: 'auto' });
      }
    },
    [idx, pages.length, storeKey, watch, onPage]
  );

  const curKey = pages[idx]?.key;
  const settled = !tracked || (curKey ? doneKeys.has(curKey) || skippedRef.current.has(curKey) : true);

  /** сторінка ще не позначена «Пройдено» — перед виходом питаємо */
  const go = useCallback(
    (n: number) => {
      if (n < 0 || n >= pages.length || n === idx) return;
      if (!settled) {
        setLeave({ to: n });
        return;
      }
      doGo(n);
    },
    [doGo, idx, pages.length, settled]
  );

  // сторінка, що ≥ 15 с була на екрані, рахується в 40 % для автодомашки (клас: викладач гортає учня),
  // але в «Пройдено» не потрапляє — це робить лише кнопка
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tracked || !curKey || doneKeys.has(curKey) || seenRef.current.has(curKey)) return;
    const id = setTimeout(async () => {
      if (document.visibilityState !== 'visible') return;
      seenRef.current.add(curKey);
      try {
        const supabase = createClient();
        const { data } = await supabase.rpc('mark_page_seen', {
          p_slug: slug,
          p_page_key: curKey,
          p_total: pagesRef.current.length,
          p_has_hw: hasHomework,
        });
        if ((data as { homework_new?: boolean } | null)?.homework_new) setHwNew(true);
      } catch {
        seenRef.current.delete(curKey);
      }
    }, 15000);
    return () => clearTimeout(id);
  }, [tracked, curKey, doneKeys, slug, hasHomework]);

  const markDone = useCallback(
    async (key: string): Promise<boolean> => {
      if (!tracked) return true;
      if (doneKeys.has(key)) return true;
      setBusy(true);
      setMarkErr(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('mark_page_done', {
          p_slug: slug,
          p_page_key: key,
          p_total: pagesRef.current.length,
          p_has_hw: hasHomework,
        });
        if (error) throw new Error(error.message);
        setDoneKeys((d) => new Set(d).add(key));
        if ((data as { homework_new?: boolean } | null)?.homework_new) setHwNew(true);
        return true;
      } catch {
        setMarkErr(t('Не вдалося зберегти. Перевір інтернет і спробуй ще раз.'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [tracked, doneKeys, slug, hasHomework, t]
  );

  // клік по посиланню, що веде з лекції (меню сайту, «До списку уроків», домашка) — теж питаємо
  useEffect(() => {
    if (!tracked || settled) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeave({ href: `${url.pathname}${url.search}${url.hash}` });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [tracked, settled]);

  const afterLeave = (l: { to: number } | { href: string }) => {
    setLeave(null);
    if ('to' in l) doGo(l.to);
    else router.push(l.href);
  };

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

  const page = pages[idx];
  const next = pages[idx + 1];
  const prev = pages[idx - 1];
  const isExercise = page.kind !== 'text' && page.kind !== 'goal';
  const isDone = tracked && doneKeys.has(page.key);
  // у режимі прогресу «пройдено» — лише те, що учень сам позначив; інакше — відвідані
  const marks = useMemo(() => {
    if (!tracked) return visited;
    const out = new Set<number>();
    pages.forEach((p, i) => doneKeys.has(p.key) && out.add(i));
    return out;
  }, [tracked, visited, pages, doneKeys]);

  return (
    <div className="lp-pager">
      <aside className="lp-pager-rail" aria-label={t("Сторінки лекції")}>
        <PageList pages={pages} idx={idx} visited={marks} go={go} strict={tracked} />
      </aside>

      <div className="lp-pager-main">
        {/* телефон: компактна панель гортання */}
        <div className="lp-pagebar">
          <button type="button" onClick={() => go(idx - 1)} disabled={!prev} aria-label={t("Попередня сторінка")}>
            ‹
          </button>
          <button type="button" className="lp-pagebar-title" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
            <span className="lp-pagebar-count">
              {idx + 1}/{pages.length}
            </span>
            <span className="lp-pagebar-label">{page.section}</span>
            <span aria-hidden="true">{listOpen ? '▴' : '▾'}</span>
          </button>
          <button type="button" onClick={() => go(idx + 1)} disabled={!next} aria-label={t("Наступна сторінка")}>
            ›
          </button>
          <div className="lp-outline-bar lp-pagebar-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(idx + 1) / pages.length})` }} />
          </div>
          {listOpen && (
            <div className="lp-pagebar-list">
              <PageList pages={pages} idx={idx} visited={marks} go={go} compact strict={tracked} />
            </div>
          )}
        </div>

        <div ref={bookRef} className="lp-book">
          {/* новий key → аркуш монтується заново, і анімація появи програється сама */}
          <section
            key={page.key}
            className={`lp-sheet is-current${dir ? ` enter-${dir}` : ''}`}
            data-kind={page.kind}
          >
            <SheetBody page={page} index={idx} total={pages.length} watch={watch} />
          </section>
        </div>

        {tracked && needsWriting(page) && <WrittenAnswer key={page.key} slug={slug} pageKey={page.key} title={page.section} />}

        {tracked && (
          <div className="lp-donebar" data-done={isDone || undefined} role="status">
            {isDone ? (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="lp-donebar-check">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                <b>{t('Пройдено')}</b>
                {hwNew && <span className="lp-donebar-note">{t('Домашка з’явилась у розділі «Домашка».')}</span>}
              </>
            ) : (
              <>
                <span className="lp-donebar-q">
                  {isExercise ? t('Зробив(ла) усе у вправі?') : t('Прочитав(ла) сторінку?')}
                </span>
                <button type="button" className="ww-btn ww-btn-secondary" disabled={busy} onClick={() => void markDone(page.key)}>
                  {busy ? t('Зберігаю…') : t('✓ Пройдено')}
                </button>
              </>
            )}
            {markErr && <span className="lp-donebar-err">{markErr}</span>}
          </div>
        )}

        <nav className="lp-turn" aria-label={t("Гортання")}>
          <button type="button" className="lp-turn-prev" onClick={() => go(idx - 1)} disabled={!prev}>
            <span className="lp-turn-k">{t("Назад")}</span>
            <span className="lp-turn-t">{prev ? (prev.kind === 'text' || prev.kind === 'goal' ? prev.section : prev.label) : t("Початок")}</span>
          </button>
          {next ? (
            <button type="button" className="lp-turn-next" onClick={() => go(idx + 1)}>
              <span className="lp-turn-k">{t("Далі")}</span>
              <span className="lp-turn-t">{next.kind === 'text' || next.kind === 'goal' ? next.section : next.label}</span>
            </button>
          ) : hasHomework ? (
            <Link href={`${base ?? `/learn/${slug}`}/hw`} className="lp-turn-next">
              <span className="lp-turn-k">{t("Лекцію завершено")}</span>
              <span className="lp-turn-t">{t("Перейти до домашнього завдання")}</span>
            </Link>
          ) : doneHref ? (
            <Link href={doneHref} className="lp-turn-next">
              <span className="lp-turn-k">{t("Лекцію завершено")}</span>
              <span className="lp-turn-t">{t("До списку уроків")}</span>
            </Link>
          ) : (
            <span className="lp-turn-next" aria-disabled="true">
              <span className="lp-turn-k">{t("Лекцію завершено")}</span>
              <span className="lp-turn-t">{t("Dziękuję! Дякуємо!")}</span>
            </span>
          )}
        </nav>
      </div>

      {leave && (
        <div
          className="lp-leave"
          role="dialog"
          aria-modal="true"
          aria-label={t('Сторінку не позначено пройденою')}
          onClick={(e) => e.target === e.currentTarget && setLeave(null)}
        >
          <div className="lp-leave-card">
            <p className="lp-leave-title">{isExercise ? t('Ти пройшов(ла) вправу?') : t('Ти прочитав(ла) сторінку?')}</p>
            <p className="lp-leave-text">
              {isExercise
                ? t('Ти не натиснув(ла) «Пройдено». Чи хочеш до неї повернутись?')
                : t('Ти не натиснув(ла) «Пройдено». Чи хочеш повернутись до сторінки?')}
            </p>
            <div className="lp-leave-row">
              <button
                type="button"
                className="ww-btn ww-btn-primary"
                disabled={busy}
                onClick={async () => {
                  if (await markDone(page.key)) afterLeave(leave);
                }}
              >
                {t('Так, пройдено')}
              </button>
              <button type="button" className="ww-btn ww-btn-secondary" onClick={() => setLeave(null)}>
                {t('Повернутись')}
              </button>
              <button
                type="button"
                className="ww-btn ww-btn-ghost"
                onClick={() => {
                  skippedRef.current.add(page.key);
                  afterLeave(leave);
                }}
              >
                {t('Пропустити')}
              </button>
            </div>
            {markErr && <p className="lp-donebar-err">{markErr}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

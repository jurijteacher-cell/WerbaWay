'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import '@/components/lesson/lesson.css';
import Link from 'next/link';
import { useT } from '@/i18n/client';
import type { BookPage } from '@/lib/pages/pages';
import { SheetBody } from '@/components/lesson/LessonBlocks';
import { isLessonPath, lessonSlugOf, pickStudent, type ClassMsg, type Presence } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';
import { MarkLessonDone } from './MarkLessonDone';

/**
 * Викладач бачить, що учень обирає й вписує у вправах; гортає лекцію сам.
 * Екран учня не передається: у викладача відкрита ВЛАСНА копія сторінки лекції, а вправи в ній
 * (iframe з ?ww_watch=1, див. LiveSpectator) показують стан, що приходить від учня.
 *
 *   учень (LiveBeacon) ──`st`: зміни стану вправ──▶ тут (storeRef) ──postMessage──▶ iframe вправи
 *   iframe вправи ──`ww-live-hello`──▶ тут: віддаємо збережений стан + просимо в учня свіжий (`need-st`)
 *
 * `topic` — classTopic(uid) для учня з акаунтом або guestTopic(vid) для гостя за посиланням;
 * `studentId` є лише в учня з акаунтом (кнопка «Пройдено, задати домашку»).
 */
export function LiveWatch({ topic, name, studentId }: { topic: string; name: string; studentId?: string }) {
  const t = useT();
  const [student, setStudent] = useState<Presence | null>(null);
  const [lesson, setLesson] = useState<{ path: string; title: string; pages: BookPage[] } | null>(null);
  /** сторінка, яку викладач відкрив сам; null — ще не гортав (тоді сторінка учня) */
  const [view, setView] = useState<number | null>(null);
  /** лічильник перемонтування вікон вправ: нова вкладка учня, «Оновити відповіді» */
  const [gen, setGen] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<string | undefined>(undefined);
  /** key вікна вправи → scope → стан, який прислав учень */
  const storeRef = useRef(new Map<string, Record<string, unknown>>());
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));

  /** усі вікна вправ на сцені з цим key (або всі) */
  const frames = (key?: string) =>
    Array.from(stageRef.current?.querySelectorAll<HTMLIFrameElement>('iframe[data-ww-live]') ?? []).filter(
      (f) => !key || f.dataset.wwLive === key
    );

  const push = (key: string, s: Record<string, unknown>, full?: boolean) => {
    for (const f of frames(key)) f.contentWindow?.postMessage({ type: 'ww-live-state', s, full }, window.location.origin);
  };

  /** попросити в учня повний стан вікна (або всіх вікон на сцені) */
  const askState = useCallback((key?: string) => {
    if (!tabRef.current) return;
    const keys = key ? [key] : [...new Set(frames().map((f) => f.dataset.wwLive ?? ''))].filter(Boolean);
    for (const k of keys) void sendRef.current({ k: 'need-st', key: k, to: tabRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // '-' — ще не вибрали вкладку: нові клієнти учня не шлють, доки не знаємо, яку дивитись
  const presence = (): Presence => ({ role: 'teacher', mode: 'watch', watch: tabRef.current ?? '-', at: Date.now() });
  const { link, send, track } = useLiveChannel({
    topic,
    presence,
    onMessage: (m) => {
      if (m.k !== 'st') return;
      const cur = m.full ? {} : { ...(storeRef.current.get(m.key) ?? {}) };
      for (const [scope, d] of Object.entries(m.s ?? {})) {
        if (d === null || d === undefined) delete cur[scope];
        else cur[scope] = d;
      }
      storeRef.current.set(m.key, cur);
      push(m.key, m.s ?? {}, m.full);
    },
    onPresence: (all) => {
      const s = pickStudent(all);
      setStudent(s);
      const tab = s?.mode === 'lesson' ? s.tab : undefined;
      if (tab !== tabRef.current) {
        tabRef.current = tab;
        storeRef.current.clear(); // стан іншої вкладки — чужий
        setGen((g) => g + 1);
        track(presence()); // скажемо учневі, яку вкладку дивимось — шле лише вона
      }
    },
  });
  sendRef.current = send;

  // вікно вправи (iframe) відкрилось: віддаємо те, що вже маємо, і просимо в учня свіже
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; key?: string } | null;
      if (!d || d.type !== 'ww-live-hello' || typeof d.key !== 'string') return;
      if (!frames(d.key).some((f) => f.contentWindow === e.source)) return;
      (e.source as Window).postMessage(
        { type: 'ww-live-state', s: storeRef.current.get(d.key) ?? {}, full: true },
        window.location.origin
      );
      askState(d.key);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askState]);

  // зв'язок відновився — за час обриву могли загубитись зміни
  const wasOnline = useRef(false);
  useEffect(() => {
    if (link === 'online' && wasOnline.current) askState();
    if (link === 'online') wasOnline.current = true;
  }, [link, askState]);

  const inLesson = !!student && student.mode === 'lesson' && isLessonPath(student.path);
  const lecturePath = inLesson ? (student?.path ?? '').replace(/\/+$/, '') : null;

  // сторінки лекції (чи домашки) учня — викладач гортає їх сам
  useEffect(() => {
    if (!lecturePath || lesson?.path === lecturePath) return;
    let off = false;
    fetch(`/api/teacher/live-lesson?path=${encodeURIComponent(lecturePath)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { title?: string; pages?: BookPage[] } | null) => {
        if (off || !d?.pages?.length) return;
        setLesson({ path: lecturePath, title: d.title ?? '', pages: d.pages });
        setView(null);
      })
      .catch(() => undefined);
    return () => {
      off = true;
    };
  }, [lecturePath, lesson?.path]);

  const slug = inLesson ? lessonSlugOf(student?.path) : null;
  // сторінки чужої (попередньої) лекції не показуємо, поки вантажиться нова
  const pages = lesson && lesson.path === lecturePath ? lesson.pages : [];
  const studentPg = typeof student?.pg === 'number' && student.pg >= 0 && student.pg < pages.length ? student.pg : null;
  const cur = pages.length ? Math.min(view ?? studentPg ?? 0, pages.length - 1) : -1;
  const own = cur >= 0 ? pages[cur] : undefined;
  const label = (p: BookPage) => (p.kind === 'text' || p.kind === 'goal' ? p.section : p.label);

  const status = link !== 'online'
    ? t('Підключаюсь…')
    : !student
      ? t("{name} зараз не на сайті. Щойно учень відкриє лекцію, тут з'являться його відповіді.", { name })
      : !inLesson
        ? t("{name} на сайті, але не в лекції. Відповіді з'являться, щойно учень відкриє лекцію.", { name })
        : !own
          ? t('Завантажую лекцію…')
          : null;

  const groups: { title: string; items: number[] }[] = [];
  pages.forEach((p, i) => {
    const title = p.num ? `${p.num}. ${p.section}` : p.section;
    const g = groups[groups.length - 1];
    if (g && g.title === title) g.items.push(i);
    else groups.push({ title, items: [i] });
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-paper-muted">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${inLesson ? 'bg-correct' : student ? 'bg-gold-fill' : 'bg-paper-muted'}`} />
          {inLesson
            ? t('у лекції: {title}', { title: student?.title || slug || '' })
            : student
              ? t('на сайті')
              : t('не в мережі')}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => {
            setGen((g) => g + 1); // вікна вправ відкриються заново й самі попросять стан
          }}
          disabled={!inLesson || link !== 'online'}
          className="ww-btn ww-btn-sm ww-btn-ghost"
          title={t('Якщо відповіді відстали від екрана учня')}
        >
          ⟳ {t('Оновити відповіді')}
        </button>
        {slug && studentId && (
          <>
            <Link href={`/learn/${slug}`} className="ww-btn ww-btn-ghost" target="_blank">
              {t('Відкрити лекцію ↗')}
            </Link>
            <MarkLessonDone studentId={studentId} lessons={[{ slug, title: student?.title || slug }]} compact />
          </>
        )}
      </div>

      {pages.length > 0 && inLesson && (
        <div className="ww-live-nav">
          <button type="button" className="ww-btn ww-btn-sm ww-btn-ghost" onClick={() => setView(cur - 1)} disabled={cur <= 0} aria-label={t('Попередня сторінка')}>
            ‹
          </button>
          <select
            className="ww-live-select"
            value={String(cur)}
            onChange={(e) => setView(Number(e.target.value))}
            aria-label={t('Сторінка лекції')}
          >
            {groups.map((g) => (
              <optgroup key={`${g.title}-${g.items[0]}`} label={g.title}>
                {g.items.map((i) => (
                  <option key={pages[i].key} value={i}>
                    {i + 1}/{pages.length} · {label(pages[i])}
                    {i === studentPg ? ' 👁' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            className="ww-btn ww-btn-sm ww-btn-ghost"
            onClick={() => setView(cur + 1)}
            disabled={cur >= pages.length - 1}
            aria-label={t('Наступна сторінка')}
          >
            ›
          </button>
          {studentPg !== null && (
            <button type="button" className="ww-btn ww-btn-sm ww-btn-accent" onClick={() => setView(studentPg)} disabled={cur === studentPg}>
              👁 {t('До учня · стор. {n}', { n: studentPg + 1 })}
            </button>
          )}
          <span className="ww-live-hint">
            {t('Гортай лекцію сам — учень лишається, де був. У вправах видно, що він обирає й вписує.')}
            {studentPg !== null ? ` ${t('Учень зараз на сторінці {n}.', { n: studentPg + 1 })}` : ''}
          </span>
        </div>
      )}

      <div className="ww-live-stage">
        {status && <p className="ww-live-status">{status}</p>}
        {own && inLesson && (
          <div ref={stageRef} className="ww-live-own" style={{ height: '80vh' }}>
            <div className="lp-root">
              <div className="lp-book">
                <section key={`${own.key}-${gen}`} className="lp-sheet is-current" data-kind={own.kind}>
                  <SheetBody page={own} index={cur} total={pages.length} watch />
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioTransport } from './AudioTransport';
import { getAccessToken, getServerState, getState, subscribe } from '@/lib/embed-auth';
import { clearProgress, isSpectator, loadProgress, saveProgress } from '@/lib/embed-progress';
import type { PublicMockExam, MockScore, ItemResult } from '@/lib/mock-exam/core';
import type { WritingGrade } from '@/lib/mock-exam/writing-grade';
import { useLocale, withLang, useT } from '@/i18n/client';

type Section = PublicMockExam['sections'][number];
type Task = Section['tasks'][number];
type Answers = Record<string, string>;
type Tab = 'start' | string;

const DIACRITICS = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];
const LETTERS = ['a', 'b', 'c', 'd', 'e'];

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

function unitIds(t: Task): string[] {
  return [...(t.items ?? []).map((i) => i.id), ...(t.gaps ?? []).map((g) => g.id)];
}

function writingDone(t: Task, answers: Answers): boolean {
  const c = t.choices?.find((x) => x.id === answers[`${t.id}:choice`]);
  return Boolean(c?.parts.some((p) => (answers[`${t.id}:${p.id}`] ?? '').trim()));
}

function countWords(s: string): number {
  return (s.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu) ?? []).length;
}

function itemNum(t: Task, i: number) {
  return (t.start_n ?? 1) + i;
}

function storeKey(id: string) {
  return `werba-mock:${id}`;
}

type Stored = {
  answers?: Answers;
  startedAt?: number;
  tab?: Tab;
  plays?: Record<string, number>;
  /** active seconds spent in each section (timer runs only while the exam is open and not paused) */
  elapsed?: Record<string, number>;
  paused?: boolean;
  result?: {
    score: MockScore;
    saved: boolean;
    transcripts?: Record<string, string>;
    resultId?: string | null;
    writingAi?: WritingGrade[] | null;
  };
};

type Attempt = {
  id: string;
  total: number;
  max: number;
  level: string | null;
  passed: boolean | null;
  minutes: number | null;
  created_at: string;
  writing: { points: number; max: number } | null;
};

type ReviewInfo = { id: string; createdAt: string; isOwner: boolean; student: string };

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Адреса цього ж вікна з розбором спроби (або без нього, `id = null`). */
function reviewHref(id: string | null) {
  const u = new URL(window.location.href);
  if (id) u.searchParams.set('review', id);
  else u.searchParams.delete('review');
  return u.toString();
}

type Ctx = {
  answers: Answers;
  set: (id: string, v: string) => void;
  locked: boolean;
  results: Map<string, ItemResult>;
  focus: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
  plays: Record<string, number>;
  onPlay: (taskId: string) => void;
  transcripts: Record<string, string>;
  paused: boolean;
  writingAi: WritingGrade[] | null;
  /** розбір збереженої спроби (свої або учня для викладача): нічого не пишеться в браузер */
  reviewing: boolean;
};

/** Login is required (the AccountBar wall covers the page); progress is stored per account. */
/** Кеш тексту іспиту: «Дивитися» перемонтовує вправу на кожне оновлення — без кешу вона блимала б «Ładowanie…». */
const examCache = new Map<string, PublicMockExam>();

/**
 * `part` — іспит як лекція: кожна частина (start · id розділу · wynik) — окрема сторінка лекції зі своїм iframe.
 * Без `part` — цілий іспит із боковим меню (розбір спроби, відкриття окремо).
 */
export function MockExam({ lessonId, reviewId, part }: { lessonId: string; reviewId?: string; part?: string }) {
  const auth = useSyncExternalStore(subscribe, getState, getServerState);
  if (!auth.ready || !auth.userId) return null;
  return (
    <MockExamInner
      key={`${auth.userId}:${reviewId ?? ''}`}
      lessonId={lessonId}
      storageId={`${auth.userId}:${lessonId}`}
      imie={auth.name ?? auth.email ?? ''}
      reviewId={reviewId}
      part={part}
    />
  );
}

function MockExamInner({
  lessonId,
  storageId,
  imie,
  reviewId,
  part,
}: {
  lessonId: string;
  storageId: string;
  imie: string;
  reviewId?: string;
  part?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [exam, setExam] = useState<PublicMockExam | null>(() => examCache.get(`${lessonId}:${locale}`) ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reviewingNow = Boolean(reviewId);
  const partMode = Boolean(part) && !reviewingNow;
  const spectator = isSpectator();
  const [tab, setTab] = useState<Tab>(partMode ? (part as string) : 'start');
  const [answers, setAnswers] = useState<Answers>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState<MockScore | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const activeInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [writingAi, setWritingAi] = useState<WritingGrade[] | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [review, setReview] = useState<ReviewInfo | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // у iframe-вікні sticky не діє: бокове меню їде за видимим фрагментом (--ww-vt) від початку блоку
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const set = () => el.style.setProperty('--mx-off', `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);
  const reviewing = Boolean(reviewId);

  // збережені спроби з акаунта: розбір будь-якої з них і перездача — з будь-якого пристрою
  const loadAttempts = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const r = await fetch(withLang(`/api/mock-exam/${lessonId}/review`, locale), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ token }),
      });
      if (r.ok) setAttempts(((await r.json()).attempts as Attempt[]) ?? []);
    } catch {
      /* offline — список просто порожній */
    }
  };

  useEffect(() => {
    fetch(withLang(`/api/mock-exam/${lessonId}`, locale))
      .then((r) => {
        if (!r.ok) throw new Error('load');
        return r.json();
      })
      .then((d: PublicMockExam) => {
        examCache.set(`${lessonId}:${locale}`, d);
        setExam(d);
      })
      .catch(() => setLoadError('Nie udało się wczytać egzaminu. Odśwież stronę.'));
  }, [lessonId, locale]);

  // Attempt state lives in this browser: unfinished answers, the open tab and, after sending,
  // the result itself — so closing the embed by accident never loses work or the score.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (reviewing) return;
    try {
      // стан живе в embed-progress (як у всіх вправ) — так його бачить «Дивитися». Чернетку зі старого
      // ключа (до 25.11) підхоплюємо один раз і переносимо.
      let s = loadProgress<Stored>('mx');
      if (!s && !spectator) {
        const raw = localStorage.getItem(storeKey(storageId));
        if (raw) {
          s = JSON.parse(raw) as Stored;
          saveProgress('mx', s);
          localStorage.removeItem(storeKey(storageId));
        }
      }
      if (s) {
        if (s.answers) setAnswers(s.answers);
        if (s.startedAt) setStartedAt(s.startedAt);
        if (s.plays) setPlays(s.plays);
        if (s.elapsed) setElapsed(s.elapsed);
        if (s.paused) setPaused(true);
        if (s.result?.score) {
          setScore(s.result.score);
          setTranscripts(s.result.transcripts ?? {});
          setSaved(s.result.saved);
          setResultId(s.result.resultId ?? null);
          setWritingAi(s.result.writingAi ?? null);
          if (!partMode) setTab('wynik');
        } else if (s.tab && s.startedAt && !partMode) {
          setTab(s.tab);
        }
      }
    } catch {
      /* storage unavailable */
    }
    setRestored(true);
    if (!spectator) void loadAttempts();
  }, [storageId, reviewing]);

  useEffect(() => {
    if (!reviewId || !exam) return;
    let alive = true;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('login');
        const r = await fetch(withLang(`/api/mock-exam/${lessonId}/review`, locale), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ token, result_id: reviewId }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'error');
        if (!alive) return;
        setAnswers(d.answers ?? {});
        setScore(d.score as MockScore);
        setTranscripts(d.transcripts ?? {});
        setWritingAi((d.writing_ai as WritingGrade[] | null) ?? null);
        setResultId(d.result_id);
        setSaved(true);
        setReview({ id: d.result_id, createdAt: d.created_at, isOwner: Boolean(d.is_owner), student: d.student ?? '' });
        // як у лекції: відкривається перше завдання вже розв'язаним
        setTab(exam.sections[0]?.id ?? 'wynik');
      } catch {
        if (alive) setReviewError('Nie udało się wczytać tego podejścia.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [reviewId, exam, lessonId, locale]);

  useEffect(() => {
    if (reviewing || spectator || !restored || startedAt == null) return;
    try {
      const data: Stored = {
        answers,
        startedAt,
        tab,
        plays,
        elapsed,
        paused,
        result: score ? { score, saved: Boolean(saved), transcripts, resultId, writingAi } : undefined,
      };
      saveProgress('mx', data);
    } catch {
      /* ignore */
    }
  }, [reviewing, restored, answers, startedAt, tab, score, saved, storageId, plays, transcripts, elapsed, paused, resultId, writingAi]);

  // Section timer: counts only while this section is open, the page is visible and the exam is not paused.
  const timerRunning = restored && !spectator && startedAt != null && !score && !paused && tab !== 'start' && tab !== 'wynik';

  // іспит-лекція: відкрив будь-яку частину з завданнями — іспит розпочато (окремої кнопки «Start» не вимагаємо)
  useEffect(() => {
    if (!partMode || !restored || spectator || startedAt != null || score) return;
    if (tab !== 'start' && tab !== 'wynik') setStartedAt(Date.now());
  }, [partMode, restored, spectator, startedAt, score, tab]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setElapsed((e) => ({ ...e, [tab]: (e[tab] ?? 0) + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, tab]);

  const results = useMemo(() => {
    const m = new Map<string, ItemResult>();
    for (const t of score?.tasks ?? []) for (const r of t.items) m.set(r.id, r);
    return m;
  }, [score]);

  const counts = useMemo(() => {
    const c: Record<string, { done: number; total: number }> = {};
    for (const s of exam?.sections ?? []) {
      const ids = s.tasks.flatMap(unitIds);
      const wr = s.tasks.filter((t) => t.layout === 'writing');
      c[s.id] = {
        done: ids.filter((id) => (answers[id] ?? '').trim()).length + wr.filter((t) => writingDone(t, answers)).length,
        total: ids.length + wr.length,
      };
    }
    return c;
  }, [exam, answers]);

  if (loadError) return <p className="nb-note">{loadError}</p>;
  if (reviewError) return <p className="nb-note">{reviewError}</p>;
  if (!exam) return <p className="nb-note">Ładowanie egzaminu…</p>;
  if (reviewing && !review) return <p className="nb-note">Ładowanie rozwiązania…</p>;

  const locked = Boolean(score);
  const set = (id: string, v: string) => {
    if (locked) return;
    setAnswers((a) => ({ ...a, [id]: v }));
  };
  const ctx: Ctx = {
    answers,
    set,
    locked,
    results,
    focus: (el) => {
      activeInput.current = el;
      setShowKeys(Boolean(el));
    },
    plays,
    onPlay: (taskId) => setPlays((p) => ({ ...p, [taskId]: (p[taskId] ?? 0) + 1 })),
    transcripts,
    paused,
    writingAi,
    reviewing,
  };

  const go = (t: Tab) => {
    setConfirming(false);
    if (partMode) {
      // сторінки іспиту — сторінки лекції: просимо LessonPager перейти; без нього (відкрито окремо) — міняємо ?part=
      if (t !== tab) {
        if (window.parent !== window) window.parent.postMessage({ type: 'ww:mx-go', to: t }, '*');
        else {
          const u = new URL(window.location.href);
          u.searchParams.set('part', t);
          window.location.href = u.toString();
        }
      }
      return;
    }
    setTab(t);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const start = () => {
    if (startedAt == null) setStartedAt(Date.now());
    go(exam.sections[0].id);
  };

  const missing = Object.values(counts).reduce((a, c) => a + (c.total - c.done), 0);
  const totalSec = Object.values(elapsed).reduce((a, b) => a + b, 0);
  const minutes = Math.floor(totalSec / 60);

  const submit = async () => {
    if (busy || spectator) return;
    setBusy(true);
    setSendError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('login');
      const res = await fetch(withLang(`/api/mock-exam/${lessonId}/finish`, locale), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          token,
          answers,
          minutes: totalSec > 0 ? totalSec / 60 : startedAt ? (Date.now() - startedAt) / 60000 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setScore(data.score as MockScore);
      setTranscripts((data.transcripts as Record<string, string>) ?? {});
      setSaved(Boolean(data.notionSaved || data.accountSaved));
      setResultId((data.result_id as string | null) ?? null);
      setWritingAi((data.writing_ai as WritingGrade[] | null) ?? null);
      void loadAttempts();
      go('wynik');
    } catch {
      setSendError('Nie udało się wysłać odpowiedzi. Sprawdź internet i spróbuj jeszcze raz.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const insertChar = (ch: string) => {
    const el = activeInput.current;
    if (!el || locked) return;
    const id = el.dataset.answerId;
    if (!id) return;
    const v = answers[id] ?? '';
    const s = el.selectionStart ?? v.length;
    const e = el.selectionEnd ?? v.length;
    const next = v.slice(0, s) + ch + v.slice(e);
    set(id, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + 1, s + 1);
    });
  };

  const retake = () => {
    try {
      clearProgress('mx');
      clearProgress('mx-audio');
      localStorage.removeItem(storeKey(storageId));
    } catch {
      /* ignore */
    }
    if (reviewing) {
      window.location.href = reviewHref(null);
      return;
    }
    setScore(null);
    setSaved(null);
    setAnswers({});
    setPlays({});
    setElapsed({});
    setPaused(false);
    setTranscripts({});
    setWritingAi(null);
    setResultId(null);
    setStartedAt(null);
    go('start');
  };

  const tabs: Array<{ id: Tab; label: string; open: boolean }> = [
    { id: 'start', label: 'Start', open: true },
    ...exam.sections.map((s) => ({
      id: s.id,
      label: `${s.tab} · ${counts[s.id]?.done ?? 0}/${counts[s.id]?.total ?? 0}`,
      open: startedAt != null || locked,
    })),
    { id: 'wynik', label: 'Wynik', open: locked },
  ];

  const sIndex = exam.sections.findIndex((s) => s.id === tab);
  const section = sIndex >= 0 ? exam.sections[sIndex] : null;

  return (
    <div className="mx" ref={topRef}>
      {partMode ? null : (
        <header className="nb-head">
          <p className="nb-eyebrow">{exam.eyebrow ?? 'egzamin próbny · B1'}</p>
          <h1>{exam.title}</h1>
          <p>{exam.subtitle}</p>
        </header>
      )}

      {review ? (
        <div className="mx-review-bar" role="status">
          <span>
            {review.isOwner ? 'Twoje podejście' : `Rozwiązanie: ${review.student || 'uczeń'}`} · {fmtDate(review.createdAt)} ·{' '}
            <b>
              {fmt(score?.total ?? 0)}/{fmt(score?.max ?? 0)} p.
            </b>
            {score?.level ? ` · ${score.level}` : ''}
          </span>
          <span className="mx-review-actions">
            <button type="button" className="mx-link" onClick={() => go('wynik')}>
              Wynik
            </button>
            {review.isOwner ? (
              <button type="button" className="nb-btn" onClick={retake}>
                Rozwiąż ponownie
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className={partMode ? 'mx-body mx-single' : 'mx-body'} ref={bodyRef}>
      {partMode ? null : (
      <nav className="nb-idx mx-rail" aria-label="Części egzaminu">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-selected={tab === t.id}
            disabled={!t.open}
            style={{ opacity: t.open ? 1 : 0.45 }}
            onClick={() => t.open && go(t.id)}
          >
            {t.label}
          </button>
        ))}
        {startedAt != null && !locked ? (
          <span className="mx-clock">
            {paused ? '⏸ ' : ''}
            {minutes} min
          </span>
        ) : null}
      </nav>
      )}

      <div className="mx-main">

      {tab === 'start' ? (
        <section className="mx-panel">
          <h2 className="mx-h2">Zanim zaczniesz</h2>
          <ul className="mx-rules">
            {exam.sections.map((s) => (
              <li key={s.id}>
                <b>{s.title}</b> —{' '}
                {s.manual
                  ? `ocenia nauczyciel${s.manual_points ? ` (${s.manual_points} p.)` : ''}`
                  : `${s.tasks.length} ${s.tasks.length === 1 ? 'zadanie' : s.tasks.length < 5 ? 'zadania' : 'zadań'}, ${fmt(s.max_points)} p.`}
                {s.minutes ? `, na egzaminie ${s.minutes} minut` : ''}
              </li>
            ))}
            {(exam.rules ?? [
              'Bez słownika i tłumacza. Możesz przechodzić między częściami.',
              `Na egzaminie trzeba mieć co najmniej ${Math.round(exam.pass_ratio * 100)}% w każdej części.`,
            ]).map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>Po wysłaniu zobaczysz wynik i poprawne odpowiedzi.</li>
          </ul>
          <p className="nb-note">
            {t("Без словника й перекладача. Після відправлення побачиш результат і правильні відповіді.")}
          </p>
          <p className="mx-saved-note">
            Odpowiedzi zapisują się same. Jeśli zamkniesz okno, wrócisz w to samo miejsce. / Відповіді
            зберігаються автоматично: закриєш вікно — повернешся туди ж (у цьому ж браузері).
          </p>
          <div className="nb-row">
            {locked && !review ? (
              <>
                <button type="button" className="nb-btn" onClick={() => go('wynik')}>
                  Twój wynik
                </button>
                <button type="button" className="nb-btn ghost" onClick={retake}>
                  Rozwiąż ponownie
                </button>
              </>
            ) : !review ? (
              <button type="button" className="nb-btn" onClick={start}>
                {startedAt != null ? 'Wracam do egzaminu' : attempts.length ? 'Rozwiąż ponownie' : 'Zaczynam'}
              </button>
            ) : null}
          </div>
          {!review && attempts.length ? <AttemptList attempts={attempts} current={resultId} /> : null}
        </section>
      ) : null}

      {section ? (
        <section className="mx-panel">
          <h2 className="mx-h2">{section.title}</h2>
          {!locked ? (
            <SectionClock
              minutes={section.minutes}
              elapsed={elapsed[section.id] ?? 0}
              paused={paused}
              onPause={() => setPaused(true)}
            />
          ) : null}
          {paused && !locked ? (
            <div className="mx-hold-card" role="status">
              <h3>⏸ Egzamin wstrzymany</h3>
              <p>
                Czas stoi, a odpowiedzi są zapisane. Wróć, kiedy będziesz mieć czas — zadania są ukryte do
                momentu wznowienia.
              </p>
              <p className="nb-note">
                {t("Іспит на паузі: час не йде, відповіді збережені. Повернись, коли буде час, — завдання приховані до відновлення.")}
              </p>
              <div className="nb-row">
                <button type="button" className="nb-btn" onClick={() => setPaused(false)}>
                  ▶ Wznów egzamin
                </button>
              </div>
            </div>
          ) : null}
          <div className={paused && !locked ? 'mx-held' : undefined}>
          {section.tasks.map((t) => (
            <TaskView
              key={t.id}
              task={t}
              ctx={ctx}
              minutes={locked ? undefined : taskMinutes(section, t)}
            />
          ))}

          <div className="mx-foot">
            {sIndex < exam.sections.length - 1 ? (
              <button type="button" className="nb-btn" onClick={() => go(exam.sections[sIndex + 1].id)}>
                Dalej: {exam.sections[sIndex + 1].tab} →
              </button>
            ) : partMode && !locked ? (
              <button type="button" className="nb-btn" onClick={() => go('wynik')}>
                Dalej: podsumowanie →
              </button>
            ) : null}
            {!partMode && !locked && sIndex === exam.sections.length - 1 && !confirming ? (
              <button type="button" className="nb-btn mx-send" onClick={() => setConfirming(true)}>
                Zakończ i wyślij
              </button>
            ) : null}
            {locked ? (
              <button type="button" className="nb-btn ghost" onClick={() => go('wynik')}>
                Wynik
              </button>
            ) : null}
          </div>

          {confirming ? (
            <div className="mx-confirm" role="alert">
              <p>
                {missing
                  ? `Bez odpowiedzi: ${missing}. Po wysłaniu nie można nic zmienić.`
                  : 'Wszystko uzupełnione. Po wysłaniu nie można nic zmienić.'}
              </p>
              <div className="nb-row">
                <button type="button" className="nb-btn mx-send" disabled={busy} onClick={submit}>
                  {busy ? 'Wysyłanie…' : 'Wyślij'}
                </button>
                <button type="button" className="nb-btn ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Wracam
                </button>
              </div>
            </div>
          ) : null}
          {sendError ? <p className="mx-error">{sendError}</p> : null}
          </div>
        </section>
      ) : null}

      {partMode && tab === 'wynik' && !score ? (
        <section className="mx-panel">
          <h2 className="mx-h2">Podsumowanie</h2>
          <ul className="mx-rules">
            {exam.sections.map((sc) => (
              <li key={sc.id}>
                <b>{sc.title}</b> — {counts[sc.id]?.done ?? 0}/{counts[sc.id]?.total ?? 0}
              </li>
            ))}
          </ul>
          {startedAt == null ? (
            <p className="nb-note">Najpierw rozwiąż zadania w częściach egzaminu — potem wróć tutaj i wyślij odpowiedzi.</p>
          ) : null}
          {!confirming ? (
            <div className="nb-row">
              <button type="button" className="nb-btn mx-send" disabled={startedAt == null || spectator} onClick={() => setConfirming(true)}>
                Zakończ i wyślij
              </button>
            </div>
          ) : (
            <div className="mx-confirm" role="alert">
              <p>
                {missing
                  ? `Bez odpowiedzi: ${missing}. Po wysłaniu nie można nic zmienić.`
                  : 'Wszystko uzupełnione. Po wysłaniu nie można nic zmienić.'}
              </p>
              <div className="nb-row">
                <button type="button" className="nb-btn mx-send" disabled={busy} onClick={submit}>
                  {busy ? 'Wysyłanie…' : 'Wyślij'}
                </button>
                <button type="button" className="nb-btn ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Wracam
                </button>
              </div>
            </div>
          )}
          {sendError ? <p className="mx-error">{sendError}</p> : null}
          {attempts.length ? <AttemptList attempts={attempts} current={resultId} /> : null}
        </section>
      ) : null}

      {tab === 'wynik' && score ? (
        <ResultView
          exam={exam}
          score={score}
          saved={saved}
          imie={imie}
          onOpen={go}
          writingAi={writingAi}
          review={review}
          canRetake={!review || review.isOwner}
          onRetake={retake}
        />
      ) : null}

      {showKeys && !locked && section ? (
        <div className="mx-keys" aria-label="Polskie znaki">
          {DIACRITICS.map((ch) => (
            <button key={ch} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertChar(ch)}>
              {ch}
            </button>
          ))}
        </div>
      ) : null}
      </div>
      </div>
    </div>
  );
}

/* ---------- tasks ---------- */

/** Time for one task: its own `minutes`, else the section time split by points (audio tasks follow the recording). */
function taskMinutes(section: Section, task: Task): number | undefined {
  if (task.minutes) return task.minutes;
  if (!section.minutes || task.audio) return undefined;
  const n = section.tasks.length;
  const total = section.max_points;
  const share = total > 0 && task.max_points > 0 ? task.max_points / total : 1 / n;
  return Math.max(1, Math.round(section.minutes * share));
}

function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function SectionClock({
  minutes,
  elapsed,
  paused,
  onPause,
}: {
  minutes?: number;
  elapsed: number;
  paused: boolean;
  onPause: () => void;
}) {
  const limit = (minutes ?? 0) * 60;
  const left = limit - elapsed;
  const over = limit > 0 && left < 0;
  const low = limit > 0 && left >= 0 && left <= 300;
  const pct = limit > 0 ? Math.min(100, (elapsed / limit) * 100) : 0;
  return (
    <div className={`mx-timebar${over ? ' over' : low ? ' low' : ''}`}>
      <div className="mx-timebar-row">
        <span className="mx-timebar-label">
          {limit > 0 ? (over ? 'Czas minął o' : 'Zostało czasu') : 'Czas w tej części'}
        </span>
        <b className="mx-timebar-val">{limit > 0 ? clock(Math.abs(left)) : clock(elapsed)}</b>
        {limit > 0 ? <span className="mx-timebar-of">z {minutes} min</span> : null}
        <button type="button" className="mx-pause" disabled={paused} onClick={onPause}>
          ⏸ Pauza
        </button>
      </div>
      {limit > 0 ? (
        <div className="mx-timebar-track" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {over ? (
        <p className="mx-timebar-msg">Na prawdziwym egzaminie ta część już by się skończyła. Dokończ spokojnie, ale zapamiętaj tempo.</p>
      ) : null}
    </div>
  );
}

function TaskView({ task, ctx, minutes }: { task: Task; ctx: Ctx; minutes?: number }) {
  const pts = task.layout === 'writing' ? 'ocenia nauczyciel' : `${fmt(task.max_points)} p.`;
  return (
    <article className="mx-task">
      <div className="mx-task-head">
        <h3>{task.title}</h3>
        <span className="mx-pts">
          {minutes ? (
            <span className="mx-time" title="Orientacyjny czas na to zadanie">
              ⏱ ≈ {minutes} min ·{' '}
            </span>
          ) : null}
          {pts}
        </span>
      </div>
      {task.topic ? <p className="mx-topic">{task.topic}</p> : null}
      {task.instruction ? <p className="mx-instr">{task.instruction}</p> : null}
      {task.audio ? <AudioPlayer task={task} ctx={ctx} /> : null}
      {task.layout === 'mc-passages' ? <McPassages task={task} ctx={ctx} /> : null}
      {task.layout === 'true-false' ? <TrueFalse task={task} ctx={ctx} /> : null}
      {task.layout === 'cloze' ? <Cloze task={task} ctx={ctx} /> : null}
      {task.layout === 'matching' ? <MatchingView task={task} ctx={ctx} /> : null}
      {task.layout === 'questions' ? <Questions task={task} ctx={ctx} /> : null}
      {task.layout === 'transform' ? <Transform task={task} ctx={ctx} /> : null}
      {task.layout === 'writing' ? <Writing task={task} ctx={ctx} /> : null}
      {ctx.locked && task.gaps?.some((g) => ctx.results.get(g.id)?.explain) ? (
        <ul className="mx-explain-list">
          {task.gaps.map((g) => {
            const r = ctx.results.get(g.id);
            return r?.explain ? (
              <li key={g.id}>
                <b>{g.n}.</b> {r.status === 'ok' ? '✓' : `→ ${r.expected}`} — {r.explain}
              </li>
            ) : null;
          })}
        </ul>
      ) : null}
      {ctx.locked && ctx.transcripts[task.id] ? (
        <details className="mx-transcript">
          <summary>Transkrypcja nagrania</summary>
          {ctx.transcripts[task.id].split('\n').map((l, i) => {
            const m = l.match(/^([^:]{1,40}):\s(.*)$/);
            return l.trim() ? (
              <p key={i}>
                {m ? <b>{m[1]}: </b> : null}
                {m ? m[2] : l}
              </p>
            ) : null;
          })}
        </details>
      ) : null}
    </article>
  );
}

function Passage({ title, text }: { title?: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="mx-passage">
      {title ? <h4>{title}</h4> : null}
      {text.split('\n\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Verdict({ r }: { r?: ItemResult }) {
  if (!r) return null;
  return (
    <>
      <VerdictMark r={r} />
      {r.explain ? <p className="mx-explain">💡 {r.explain}</p> : null}
    </>
  );
}

function VerdictMark({ r }: { r: ItemResult }) {
  if (r.status === 'ok') return <span className="mx-ok">✓{r.note ? ` (${r.note})` : ''}</span>;
  if (r.status === 'check')
    return (
      <span className="mx-check">
        nauczyciel sprawdzi · wzór: <b>{r.expected}</b>
      </span>
    );
  return (
    <span className="mx-no">
      ✗ poprawnie: <b>{r.expected}</b>
    </span>
  );
}

type Ex = Record<string, unknown>;

function McPassages({ task, ctx }: { task: Task; ctx: Ctx }) {
  const ex = task.example as Ex | undefined;
  const block = (
    key: string,
    passage: string,
    stem: string,
    options: string[],
    selected: string,
    onPick: ((l: string) => void) | null,
    num: ReactNode,
    r?: ItemResult,
    exAnswer?: string
  ) => (
    <div key={key} className={`mx-mc${exAnswer ? ' mx-example' : ''}`}>
      {passage ? (
        <p className="mx-mc-pass">
          {num}
          {passage}
        </p>
      ) : null}
      <p className="mx-stem">
        {passage ? null : num}
        {stem}
      </p>
      <div className="mx-opts">
        {options.map((o, i) => {
          const l = LETTERS[i];
          const on = (exAnswer ?? selected) === l;
          const cls = r ? (r.expected.startsWith(`${l})`) ? ' good' : on ? ' bad' : '') : '';
          return (
            <button
              key={l}
              type="button"
              className={`mx-opt${on ? ' on' : ''}${cls}`}
              disabled={!onPick}
              onClick={() => onPick?.(l)}
            >
              <b>{l})</b> {o}
            </button>
          );
        })}
      </div>
      {r ? <Verdict r={r} /> : null}
    </div>
  );
  return (
    <div className="mx-stack">
      {ex
        ? block(
            'ex',
            String(ex.passage ?? ''),
            String(ex.stem ?? ''),
            (ex.options as string[]) ?? [],
            '',
            null,
            <span className="mx-exlabel">Przykład </span>,
            undefined,
            String(ex.answer ?? '')
          )
        : null}
      {(task.items ?? []).map((it, i) =>
        it.kind === 'tf' ? (
          <TfRow
            key={it.id}
            num={<span className="mx-num">{itemNum(task, i)}. </span>}
            heading={it.passage}
            text={it.stem ?? it.text ?? ''}
            labels={task.tf_labels ?? ['TAK', 'NIE']}
            value={ctx.answers[it.id] ?? ''}
            onPick={ctx.locked ? null : (v) => ctx.set(it.id, v)}
            r={ctx.results.get(it.id)}
          />
        ) : (
          block(
            it.id,
            it.passage ?? '',
            it.stem ?? '',
            it.options ?? [],
            ctx.answers[it.id] ?? '',
            ctx.locked ? null : (l) => ctx.set(it.id, l),
            <span className="mx-num">{itemNum(task, i)}. </span>,
            ctx.results.get(it.id)
          )
        )
      )}
    </div>
  );
}

function TfRow({
  num,
  heading,
  text,
  labels,
  value,
  onPick,
  r,
  exm = false,
}: {
  num: ReactNode;
  heading?: string;
  text: string;
  labels: string[];
  value: string;
  onPick: ((v: string) => void) | null;
  r?: ItemResult;
  exm?: boolean;
}) {
  return (
    <div className={`mx-tf-row${exm ? ' mx-example' : ''}`}>
      {heading ? <p className="mx-mc-pass">{heading}</p> : null}
      <p>
        {num}
        {text}
      </p>
      <div className="mx-tf-btns">
        {labels.map((v) => {
          const on = value === v;
          const cls = r ? (r.expected === v ? ' good' : on ? ' bad' : '') : '';
          return (
            <button
              key={v}
              type="button"
              className={`nb-tf${on ? ' sel' : ''}${cls}`}
              disabled={!onPick}
              onClick={() => onPick?.(v)}
            >
              {v}
            </button>
          );
        })}
      </div>
      {r ? <Verdict r={r} /> : null}
    </div>
  );
}

function TrueFalse({ task, ctx }: { task: Task; ctx: Ctx }) {
  const ex = task.example as Ex | undefined;
  const row = (key: string, num: ReactNode, text: string, value: string, id: string | null, exm = false) => {
    const r = id ? ctx.results.get(id) : undefined;
    return (
      <div key={key} className={`mx-tf-row${exm ? ' mx-example' : ''}`}>
        <p>
          {num}
          {text}
        </p>
        <div className="mx-tf-btns">
          {(task.tf_labels ?? ['TAK', 'NIE']).map((v) => {
            const on = value === v;
            const cls = r ? (r.expected === v ? ' good' : on ? ' bad' : '') : '';
            return (
              <button
                key={v}
                type="button"
                className={`nb-tf${on ? ' sel' : ''}${cls}`}
                disabled={!id || ctx.locked}
                onClick={() => id && ctx.set(id, v)}
              >
                {v}
              </button>
            );
          })}
        </div>
        {r ? <Verdict r={r} /> : null}
      </div>
    );
  };
  return (
    <>
      <Passage title={task.passage_title} text={task.passage} />
      <div className="mx-stack">
        {ex ? row('ex', <span className="mx-exlabel">Przykład: </span>, String(ex.text), String(ex.answer), null, true) : null}
        {(task.items ?? []).map((it, i) =>
          row(it.id, <span className="mx-num">{itemNum(task, i)}. </span>, it.text ?? '', ctx.answers[it.id] ?? '', it.id)
        )}
      </div>
    </>
  );
}

function Cloze({ task, ctx }: { task: Task; ctx: Ctx }) {
  const ex = task.example as Ex | undefined;
  const gaps = new Map((task.gaps ?? []).map((g) => [String(g.n), g]));
  const bankOptions: Array<{ value: string; label: string }> = task.bank
    ? task.bank.map((b) => ({ value: b.key, label: `${b.key}. ${b.text}` }))
    : (task.bank_words ?? []).map((w) => ({ value: w, label: w }));

  const renderGap = (key: string): ReactNode => {
    if (key === 'ex') {
      const ans = String(ex?.answer ?? '');
      const opts = (ex?.options as string[] | undefined) ?? null;
      return (
        <span className="mx-gap-ex" title="Przykład">
          {opts ? (
            <>
              ({' '}
              {opts.map((o, i) => (
                <Fragment key={o}>
                  {i ? ' / ' : ''}
                  <span className={o === ans ? 'mx-ex-on' : undefined}>{o}</span>
                </Fragment>
              ))}{' '}
              )
            </>
          ) : task.bank ? (
            <>
              <b>[{ans}]</b> {task.bank.find((b) => b.key === ans)?.text}
            </>
          ) : (
            <b>{ans}</b>
          )}
          <sup>przykład</sup>
        </span>
      );
    }
    const g = gaps.get(key);
    if (!g) return `{{${key}}}`;
    const r = ctx.results.get(g.id);
    const v = ctx.answers[g.id] ?? '';
    const state = r ? (r.status === 'ok' ? ' ok' : ' no') : '';
    let control: ReactNode;
    if (g.kind === 'options') {
      control = (
        <span className={`mx-choice${state}`}>
          <sup className="mx-gapnum">{g.n}</sup>
          {(g.options ?? []).map((o) => {
            const on = v === o;
            const cls = r ? (r.expected === o ? ' good' : on ? ' bad' : '') : '';
            return (
              <button
                key={o}
                type="button"
                className={`mx-pick${on ? ' on' : ''}${cls}`}
                disabled={ctx.locked}
                onClick={() => ctx.set(g.id, on ? '' : o)}
              >
                {o}
              </button>
            );
          })}
        </span>
      );
    } else if (g.kind === 'bank') {
      control = (
        <span className={`mx-selwrap${state}`}>
          <sup className="mx-gapnum">{g.n}</sup>
          <select
            className={`mx-select${task.bank ? ' letters' : ''}`}
            value={v}
            disabled={ctx.locked}
            onChange={(e) => ctx.set(g.id, e.target.value)}
            aria-label={`Luka ${g.n}`}
          >
            <option value="">{task.bank ? '—' : '……'}</option>
            {bankOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {task.bank ? o.value : o.label}
              </option>
            ))}
          </select>
          {task.bank && v ? (
            <span className="mx-bank-echo">{task.bank.find((b) => b.key === v)?.text}</span>
          ) : null}
        </span>
      );
    } else {
      control = (
        <span className={`mx-selwrap${state}`}>
          <sup className="mx-gapnum">{g.n}</sup>
          <input
            className={`nb-blank mx-input${state}`}
            data-answer-id={g.id}
            value={v}
            disabled={ctx.locked}
            onChange={(e) => ctx.set(g.id, e.target.value)}
            onFocus={(e) => ctx.focus(e.currentTarget)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label={`Luka ${g.n}`}
          />
        </span>
      );
    }
    return (
      <>
        {control}
        {r && r.status !== 'ok' && g.kind !== 'options' ? (
          <span className="mx-fix">→ {r.expected}</span>
        ) : r?.note ? (
          <span className="mx-fixnote">({r.note})</span>
        ) : null}
      </>
    );
  };

  const renderLine = (line: string, li: number) => {
    const m = line.match(/^([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+):\s(.*)$/);
    const body = m ? m[2] : line;
    const parts = body.split(/(\{\{(?:ex|\d+)\}\})/g);
    return (
      <span key={li} className={m ? 'mx-line' : undefined}>
        {m ? <b className="mx-speaker">{m[1]}:</b> : null}
        {parts.map((p, i) => {
          const mm = p.match(/^\{\{(ex|\d+)\}\}$/);
          return <Fragment key={i}>{mm ? renderGap(mm[1]) : p}</Fragment>;
        })}
      </span>
    );
  };

  return (
    <>
      {task.bank ? (
        <ul className="mx-bank">
          {task.bank.map((b) => (
            <li key={b.key}>
              <b>{b.key}.</b> {b.text}
            </li>
          ))}
        </ul>
      ) : null}
      {task.bank_words ? (
        <div className="mx-words" aria-label="Ramka">
          {task.bank_words.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
      ) : null}
      <div className="mx-cloze">
        {task.passage_title ? <h4>{task.passage_title}</h4> : null}
        {(task.text ?? '').split('\n\n').map((para, pi) => (
          <p key={pi}>
            {para.split('\n').map((line, li) => (
              <Fragment key={li}>
                {li ? <br /> : null}
                {renderLine(line, li)}
              </Fragment>
            ))}
          </p>
        ))}
      </div>
    </>
  );
}

function MatchingView({ task, ctx }: { task: Task; ctx: Ctx }) {
  const ex = task.example as Ex | undefined;
  const keys = (task.right ?? []).map((r) => r.key);
  const used = new Set(Object.entries(ctx.answers).filter(([k]) => k.startsWith(`${task.id}-`)).map(([, v]) => v));
  const showRight = (task.right ?? []).some((r) => r.text);
  const isPic = (t: string) => /^[^\p{L}\p{N}]+$/u.test(t.trim());
  return (
    <>
      {task.passage_title ? <h4 className="mx-subtitle">{task.passage_title}</h4> : null}
      <div className={`mx-match${showRight ? '' : ' solo'}`}>
        {showRight ? (
          <div className="mx-match-right">
            <p className="mx-col">{task.right_label ?? 'Kolumna II'}</p>
            {(task.right ?? []).map((r) => (
              <div
                key={r.key}
                className={`mx-frag${isPic(r.text) ? ' pic' : ''}${used.has(r.key) && !task.reuse_keys ? ' used' : ''}${ex?.answer === r.key ? ' exm' : ''}`}
              >
                <b>{r.key}</b>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mx-match-left">
          <p className="mx-col">{task.left_label ?? 'Kolumna I — tytuły'}</p>
          {ex ? (
            <div className="mx-title-row mx-example">
              <p className={String(ex.text ?? '').includes('\n') ? 'mx-long' : undefined}>
                <span className="mx-exlabel">Przykład: </span>
                {ex.emoji ? <span className="mx-emoji">{String(ex.emoji)}</span> : null}
                {String(ex.text ?? '')}
              </p>
              <div className="mx-letters">
                <span className="mx-letter on">{String(ex.answer)}</span>
              </div>
            </div>
          ) : null}
          {(task.items ?? []).map((it, i) => {
            const v = ctx.answers[it.id] ?? '';
            const r = ctx.results.get(it.id);
            const expected = r?.expected.split(' · ')[0];
            return (
              <div key={it.id} className="mx-title-row">
                <p className={(it.text ?? '').includes('\n') ? 'mx-long' : undefined}>
                  <span className="mx-num">{itemNum(task, i)}. </span>
                  {it.emoji ? <span className="mx-emoji">{it.emoji}</span> : null}
                  {it.text}
                </p>
                <div className="mx-letters">
                  {keys.map((k) => {
                    const on = v === k;
                    const cls = r ? (expected === k ? ' good' : on ? ' bad' : '') : '';
                    return (
                      <button
                        key={k}
                        type="button"
                        className={`mx-letter${on ? ' on' : ''}${cls}`}
                        disabled={ctx.locked || (!task.reuse_keys && ex?.answer === k)}
                        onClick={() => ctx.set(it.id, on ? '' : k)}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
                {r ? <Verdict r={{ ...r, expected: expected ?? r.expected }} /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Underlined({ s }: { s: string }) {
  return (
    <>
      {s.split(/(__[^_]+__)/g).map((p, i) =>
        p.startsWith('__') ? <u key={i}>{p.slice(2, -2)}</u> : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

function Questions({ task, ctx }: { task: Task; ctx: Ctx }) {
  const ex = task.example as Ex | undefined;
  return (
    <div className="mx-stack">
      {ex ? (
        <div className="mx-q mx-example">
          <p>
            <span className="mx-exlabel">Przykład: </span>
            <Underlined s={String(ex.sentence)} />
          </p>
          <p className="mx-q-line">
            – <b>{String(ex.answer)}</b> {String(ex.after)} – {String(ex.reply)}
          </p>
        </div>
      ) : null}
      {(task.items ?? []).map((it, i) => {
        const r = ctx.results.get(it.id);
        const state = r ? (r.status === 'ok' ? ' ok' : ' no') : '';
        return (
          <div key={it.id} className="mx-q">
            <p>
              <span className="mx-num">{itemNum(task, i)}. </span>
              <Underlined s={it.sentence ?? ''} />
            </p>
            <p className="mx-q-line">
              –{' '}
              <input
                className={`nb-blank mx-input${state}`}
                data-answer-id={it.id}
                value={ctx.answers[it.id] ?? ''}
                disabled={ctx.locked}
                onChange={(e) => ctx.set(it.id, e.target.value)}
                onFocus={(e) => ctx.focus(e.currentTarget)}
                autoComplete="off"
                spellCheck={false}
                aria-label={`Pytanie ${i + 1}`}
              />{' '}
              {it.after}
              <br />– {it.reply}
            </p>
            {r ? <Verdict r={r} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function Transform({ task, ctx }: { task: Task; ctx: Ctx }) {
  const ex = task.example as Ex | undefined;
  return (
    <div className="mx-stack">
      {ex ? (
        <div className="mx-tr mx-example">
          <p>
            <span className="mx-exlabel">Przykład: </span>
            {String(ex.sentence)} <span className="mx-kw">{String(ex.keyword)}</span>
          </p>
          <p className="mx-tr-ans">→ {String(ex.answer)}</p>
        </div>
      ) : null}
      {(task.items ?? []).map((it, i) => {
        const r = ctx.results.get(it.id);
        const state = r ? (r.status === 'ok' ? ' ok' : r.status === 'check' ? ' chk' : ' no') : '';
        return (
          <div key={it.id} className="mx-tr">
            <p>
              <span className="mx-num">{itemNum(task, i)}. </span>
              {it.sentence} <span className="mx-kw">{it.keyword}</span>
            </p>
            <textarea
              className={`mx-area${state}`}
              data-answer-id={it.id}
              rows={2}
              value={ctx.answers[it.id] ?? ''}
              disabled={ctx.locked}
              onChange={(e) => ctx.set(it.id, e.target.value)}
              onFocus={(e) => ctx.focus(e.currentTarget)}
              spellCheck={false}
              aria-label={`Przekształcenie ${i + 1}`}
            />
            {r ? <Verdict r={r} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function AudioPlayer({ task, ctx }: { task: Task; ctx: Ctx }) {
  const audio = task.audio!;
  const ref = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const used = ctx.plays[task.id] ?? 0;
  const left = Math.max(0, audio.max_plays - used);
  useEffect(() => {
    if (ctx.paused && state === 'playing') {
      ref.current?.pause();
      setState('paused');
    }
  }, [ctx.paused, state]);
  // «Дивитися учня»: викладач чує те саме — на кожну подію плеєра пишемо позицію (embed-progress → маячок → викладач)
  useEffect(() => {
    const el = ref.current;
    if (!el || ctx.reviewing || ctx.locked || isSpectator()) return;
    let lastBeat = 0;
    const send = (playing: boolean) => {
      saveProgress('mx-audio', { src: audio.src, playing, pos: el.currentTime || 0, n: Date.now() });
    };
    const onPlay = () => send(true);
    const onStop = () => send(false);
    const onTime = () => {
      if (el.paused || Date.now() - lastBeat < 3000) return;
      lastBeat = Date.now();
      send(true);
    };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onStop);
    el.addEventListener('ended', onStop);
    el.addEventListener('seeked', onTime);
    el.addEventListener('timeupdate', onTime);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onStop);
      el.removeEventListener('ended', onStop);
      el.removeEventListener('seeked', onTime);
      el.removeEventListener('timeupdate', onTime);
      if (!el.paused) send(false);
    };
  }, [audio.src, ctx.locked, ctx.reviewing]);
  if (ctx.locked) {
    return (
      <div className="mx-audio">
        <audio controls preload="none" src={audio.src} className="mx-audio-free" />
      </div>
    );
  }
  const play = () => {
    const el = ref.current;
    if (!el) return;
    if (state === 'paused') {
      void el.play();
      setState('playing');
      return;
    }
    if (state === 'playing') {
      el.pause();
      setState('paused');
      return;
    }
    if (left <= 0) return;
    ctx.onPlay(task.id);
    el.currentTime = 0;
    void el.play();
    setState('playing');
  };
  const label =
    state === 'playing'
      ? '❚❚ Pauza'
      : state === 'paused'
        ? '▶ Wznów'
        : left > 0
          ? `▶ Odsłuchaj (${used + 1}/${audio.max_plays})`
          : 'Nagranie odsłuchane';
  return (
    <div className="mx-audio">
      <audio
        ref={ref}
        preload="auto"
        src={audio.src}
        onEnded={() => {
          setState('idle');
        }}
      />
      <button type="button" className="nb-btn" disabled={(state === 'idle' && left <= 0) || isSpectator()} onClick={play}>
        {label}
      </button>
      <AudioTransport
        audioRef={ref}
        enabled={state !== 'idle'}
        onStop={() => setState('paused')}
      />
      <span className="mx-audio-note">
        {audio.note ?? (audio.max_plays === 1 ? 'Nagranie usłyszysz jeden raz.' : `Nagranie usłyszysz ${audio.max_plays} razy.`)}
      </span>
    </div>
  );
}

function PromptText({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`l${out.length}`}>
          {list.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  for (const l of lines) {
    if (/^[-•]\s/.test(l)) list.push(l.replace(/^[-•]\s/, ''));
    else {
      flush();
      out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  }
  flush();
  return <div className="mx-prompt">{out}</div>;
}

function WritingAiView({ grade, choiceId }: { grade?: WritingGrade; choiceId: string }) {
  const t = useT();
  if (!choiceId) return null;
  if (!grade || grade.choice !== choiceId)
    return <p className="mx-check-note">{t("Tekst oceni nauczyciel. / Текст оцінить викладач.")}</p>;
  return (
    <div className="mx-ai">
      <div className="mx-ai-head">
        <b>Ocena tekstu (AI, orientacyjnie)</b>
        <span className="mx-ai-score">
          {fmt(grade.points)}/{fmt(grade.max)} p.
          {grade.level ? ` · ${grade.level}` : ''}
          {grade.raw != null ? <small> ({fmt(grade.raw)}/{fmt(grade.raw_max ?? 20)} wg kryteriów telc)</small> : null}
        </span>
      </div>
      {grade.parts.map((p) => (
        <div key={p.part} className="mx-ai-part">
          {grade.parts.length > 1 ? (
            <h5>
              {p.label} · {fmt(p.points)}/{fmt(p.max)} p.
            </h5>
          ) : null}
          <table className="mx-ai-crit">
            <tbody>
              {p.criteria.map((c) => (
                <tr key={c.id}>
                  <th>{c.name}</th>
                  <td className={c.points >= c.max ? 'mx-ok' : c.points <= c.max / 3 ? 'mx-no' : undefined}>
                    {fmt(c.points)}/{fmt(c.max)}
                  </td>
                  <td>{c.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.comment ? <p className="mx-ai-comment">{p.comment}</p> : null}
          {p.corrections.length ? (
            <ul className="mx-ai-fix">
              {p.corrections.map((c, i) => (
                <li key={i}>
                  <s>{c.wrong}</s> → <b>{c.right}</b>
                  {c.why ? <span> — {c.why}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {p.improved ? (
            <details className="mx-transcript">
              <summary>Poprawiona wersja tekstu</summary>
              {p.improved.split('\n').map((l, i) => (l.trim() ? <p key={i}>{l}</p> : null))}
            </details>
          ) : null}
        </div>
      ))}
      <p className="nb-note">{t("Оцінку зробив AI за критеріями іспиту — вона орієнтовна. Викладач бачить твій текст і може оцінити інакше.")}</p>
    </div>
  );
}

function Writing({ task, ctx }: { task: Task; ctx: Ctx }) {
  const t = useT();
  const choiceKey = `${task.id}:choice`;
  const choiceId = ctx.answers[choiceKey] ?? '';
  const choice = task.choices?.find((c) => c.id === choiceId);
  return (
    <div className="mx-stack">
      <div className="mx-choices">
        {(task.choices ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            className={`mx-choice-card${c.id === choiceId ? ' on' : ''}`}
            disabled={ctx.locked}
            onClick={() => ctx.set(choiceKey, c.id)}
          >
            <b>{c.label}</b>
            {c.intro ? <span>{c.intro}</span> : null}
          </button>
        ))}
      </div>
      {!choice && !ctx.locked ? <p className="nb-note">{t("Wybierz jeden temat. / Обери одну тему.")}</p> : null}
      {choice?.parts.map((p) => {
        const id = `${task.id}:${p.id}`;
        const v = ctx.answers[id] ?? '';
        const n = countWords(v);
        const lo = p.words ? Math.floor(p.words * 0.9) : 0;
        const hi = p.words ? Math.ceil(p.words * 1.1) : 0;
        const state = !p.words || !n ? '' : n < lo ? ' short' : n > hi ? ' long' : ' fine';
        return (
          <div key={p.id} className="mx-write">
            <h4>{p.label}</h4>
            <PromptText text={p.prompt} />
            <textarea
              className="mx-area mx-write-area"
              data-answer-id={id}
              rows={p.words && p.words < 60 ? 5 : 12}
              value={v}
              disabled={ctx.locked}
              onChange={(e) => ctx.set(id, e.target.value)}
              onFocus={(e) => ctx.focus(e.currentTarget)}
              spellCheck={false}
              aria-label={p.label}
            />
            <p className={`mx-wc${state}`}>
              {n} słów{p.words ? ` · limit ${p.words} (od ${lo} do ${hi})` : ''}
            </p>
          </div>
        );
      })}
      {ctx.locked ? <WritingAiView grade={ctx.writingAi?.find((g) => g.task === task.id)} choiceId={choiceId} /> : null}
    </div>
  );
}

/* ---------- result ---------- */

function AttemptList({ attempts, current }: { attempts: Attempt[]; current: string | null }) {
  const t = useT();
  return (
    <div className="mx-attempts">
      <h3 className="mx-h3">Twoje podejścia</h3>
      <p className="nb-note">{t("Кожна спроба зберігається. Відкрий будь-яку — побачиш свої відповіді й правильні прямо в завданнях.")}</p>
      <ul>
        {attempts.map((a) => (
          <li key={a.id} className={a.id === current ? 'on' : undefined}>
            <span className="mx-att-date">{fmtDate(a.created_at)}</span>
            <span className="mx-att-score">
              {fmt(a.total)}/{fmt(a.max)} p.{a.level ? ` · ${a.level}` : a.passed != null ? (a.passed ? ' · zdane' : ' · poniżej progu') : ''}
              {a.writing ? ` · pisanie ${fmt(a.writing.points)}/${fmt(a.writing.max)}` : ''}
            </span>
            <a className="mx-link" href={reviewHref(a.id)}>
              Zobacz rozwiązanie
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultView({
  exam,
  score,
  saved,
  imie,
  onOpen,
  onRetake,
  writingAi,
  review,
  canRetake,
}: {
  exam: PublicMockExam;
  score: MockScore;
  saved: boolean | null;
  imie: string;
  onOpen: (t: Tab) => void;
  onRetake: () => void;
  writingAi: WritingGrade[] | null;
  review: ReviewInfo | null;
  canRetake: boolean;
}) {
  const t = useT();
  const [askRetake, setAskRetake] = useState(false);
    const auto = score.sections.filter((s) => !s.manual);
  const manual = exam.sections.filter((s) => s.manual);
  const checks = score.tasks.reduce((a, t) => a + t.items.filter((r) => r.status === 'check').length, 0);
  const passPct = Math.round(exam.pass_ratio * 100);
  const telc = exam.scoring === 'telc';
  const lv = Object.entries(exam.levels ?? { B1: 27, B2: 43 }).sort((a, b) => a[1] - b[1]);
  return (
    <section className="mx-panel mx-result">
      <p className="nb-eyebrow">{review && !review.isOwner ? review.student || 'uczeń' : imie}</p>
      <div className="mx-stamp">
        {fmt(score.total)}
        <small>/{score.max}</small>
      </div>
      {telc ? (
        <p className="mx-verdict">
          Poziom w części pisemnej: <b>{score.level ?? '—'}</b>
          <br />
          <small>
            {lv.map(([k, v]) => `${k} od ${v} p.`).join(' · ')} (bez wypowiedzi pisemnej). Na certyfikat trzeba też zdać
            egzamin ustny.
          </small>
        </p>
      ) : (
        <p className="mx-verdict">
          {score.passed
            ? auto.length > 1
              ? 'Próg zaliczony we wszystkich częściach, które sprawdza komputer.'
              : 'Próg zaliczony.'
            : `Na prawdziwym egzaminie potrzeba co najmniej ${passPct}% w każdej części.`}
        </p>
      )}

      <div className="mx-bars">
        {auto.map((s) => {
          const w = s.max ? (s.points / s.max) * 100 : 0;
          return (
            <div key={s.id} className="mx-bar-row">
              <div className="mx-bar-head">
                <b>{s.title}</b>
                <span className={telc ? undefined : s.passed ? 'mx-ok' : 'mx-no'}>
                  {fmt(s.points)}/{fmt(s.max)} p. {telc ? '' : s.passed ? '✓' : '✗'}
                </span>
              </div>
              <div className="mx-bar">
                <i style={{ width: `${w}%` }} className={telc || s.passed ? 'pass' : 'fail'} />
                {telc ? null : <em style={{ left: `${exam.pass_ratio * 100}%` }} title={`próg ${passPct}%`} />}
              </div>
            </div>
          );
        })}
      </div>

      {writingAi?.length ? (
        <div className="mx-bars">
          {writingAi.map((g) => (
            <div key={g.task} className="mx-bar-row">
              <div className="mx-bar-head">
                <b>Pisanie · ocena AI</b>
                <span>
                  {fmt(g.points)}/{fmt(g.max)} p.{g.level ? ` · ${g.level}` : ''}
                </span>
              </div>
              <div className="mx-bar">
                <i style={{ width: `${g.max ? (g.points / g.max) * 100 : 0}%` }} className="pass" />
              </div>
            </div>
          ))}
          <p className="nb-note">{t("Оцінка письма — орієнтовна, її робить AI за критеріями іспиту. Розбір — під твоїм текстом у вкладці «Pisanie».")}</p>
        </div>
      ) : null}

      {checks ? (
        <p className="mx-check-note">
          {checks} {checks === 1 ? 'odpowiedź otwartą' : 'odpowiedzi otwarte'} sprawdzi nauczyciel — na razie liczone jako 0
          p.
        </p>
      ) : null}
      {(writingAi?.length ? [] : manual).map((s) => (
        <p key={s.id} className="mx-check-note">
          {s.title}: ocenia nauczyciel{s.manual_points ? ` (max ${s.manual_points} p.)` : ''} — tekst wysłany razem z
          wynikiem.
        </p>
      ))}

      <table className="mx-table">
        <tbody>
          {exam.sections
            .filter((s) => !s.manual)
            .map((s) => (
            <Fragment key={s.id}>
              <tr className="mx-table-sec">
                <th colSpan={2}>{s.tab}</th>
              </tr>
              {score.tasks
                .filter((t) => t.section === s.id)
                .map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.title}
                      {t.topic ? <span className="mx-topic-inline"> · {t.topic}</span> : null}
                    </td>
                    <td
                      className={t.points === t.max ? 'mx-ok' : t.points / t.max < exam.pass_ratio ? 'mx-no' : undefined}
                    >
                      {fmt(t.points)}/{fmt(t.max)}
                    </td>
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="nb-row mx-center">
        {exam.sections.map((s) => (
          <button key={s.id} type="button" className="nb-btn ghost" onClick={() => onOpen(s.id)}>
            {s.manual ? (writingAi?.length ? 'Ocena tekstu' : 'Twój tekst') : 'Zobacz błędy'}: {s.tab}
          </button>
        ))}
      </div>
      {review && !review.isOwner ? null : <p className="nb-note">
        {saved === false
          ? 'Wynik nie zapisał się u nauczyciela. Zrób zrzut ekranu i wyślij go.'
          : t("Wynik wysłany do nauczyciela. / Результат надіслано викладачеві.")}
      </p>}
      {canRetake ? <div className="nb-row mx-center">
        {askRetake ? (
          <>
            <span className="mx-retake-q">Ten wynik zostaje zapisany w «Twoje podejścia». Zacząć nowe podejście?</span>
            <button type="button" className="nb-btn ghost" onClick={onRetake}>
              Tak, od nowa
            </button>
            <button type="button" className="nb-btn ghost" onClick={() => setAskRetake(false)}>
              Nie
            </button>
          </>
        ) : (
          <button type="button" className="nb-btn" onClick={() => setAskRetake(true)}>
            Rozwiąż ponownie
          </button>
        )}
      </div> : null}
      {exam.source ? <p className="mx-source">Źródło zadań: {exam.source}</p> : null}
    </section>
  );
}

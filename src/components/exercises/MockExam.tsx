'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AudioTransport } from './AudioTransport';
import { getAccessToken, getServerState, getState, subscribe } from '@/lib/embed-auth';
import type { PublicMockExam, MockScore, ItemResult } from '@/lib/mock-exam/core';

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
  result?: { score: MockScore; saved: boolean; transcripts?: Record<string, string> };
};

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
};

/** Login is required (the AccountBar wall covers the page); progress is stored per account. */
export function MockExam({ lessonId }: { lessonId: string }) {
  const auth = useSyncExternalStore(subscribe, getState, getServerState);
  if (!auth.ready || !auth.userId) return null;
  return (
    <MockExamInner
      key={auth.userId}
      lessonId={lessonId}
      storageId={`${auth.userId}:${lessonId}`}
      imie={auth.name ?? auth.email ?? ''}
    />
  );
}

function MockExamInner({ lessonId, storageId, imie }: { lessonId: string; storageId: string; imie: string }) {
  const [exam, setExam] = useState<PublicMockExam | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('start');
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
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`/api/mock-exam/${lessonId}`)
      .then((r) => {
        if (!r.ok) throw new Error('load');
        return r.json();
      })
      .then((d: PublicMockExam) => setExam(d))
      .catch(() => setLoadError('Nie udało się wczytać egzaminu. Odśwież stronę.'));
  }, [lessonId]);

  // Attempt state lives in this browser: unfinished answers, the open tab and, after sending,
  // the result itself — so closing the embed by accident never loses work or the score.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey(storageId));
      if (raw) {
        const s = JSON.parse(raw) as Stored;
        if (s.answers) setAnswers(s.answers);
        if (s.startedAt) setStartedAt(s.startedAt);
        if (s.plays) setPlays(s.plays);
        if (s.elapsed) setElapsed(s.elapsed);
        if (s.paused) setPaused(true);
        if (s.result?.score) {
          setScore(s.result.score);
          setTranscripts(s.result.transcripts ?? {});
          setSaved(s.result.saved);
          setTab('wynik');
        } else if (s.tab && s.startedAt) {
          setTab(s.tab);
        }
      }
    } catch {
      /* storage unavailable */
    }
    setRestored(true);
  }, [storageId]);

  useEffect(() => {
    if (!restored || startedAt == null) return;
    try {
      const data: Stored = {
        answers,
        startedAt,
        tab,
        plays,
        elapsed,
        paused,
        result: score ? { score, saved: Boolean(saved), transcripts } : undefined,
      };
      localStorage.setItem(storeKey(storageId), JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [restored, answers, startedAt, tab, score, saved, storageId, plays, transcripts, elapsed, paused]);

  // Section timer: counts only while this section is open, the page is visible and the exam is not paused.
  const timerRunning = restored && startedAt != null && !score && !paused && tab !== 'start' && tab !== 'wynik';
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
  if (!exam) return <p className="nb-note">Ładowanie egzaminu…</p>;

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
  };

  const go = (t: Tab) => {
    setTab(t);
    setConfirming(false);
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
    if (busy) return;
    setBusy(true);
    setSendError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('login');
      const res = await fetch(`/api/mock-exam/${lessonId}/finish`, {
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
      setSaved(Boolean(data.notionSaved));
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
      <header className="nb-head">
        <p className="nb-eyebrow">{exam.eyebrow ?? 'egzamin próbny · B1'}</p>
        <h1>{exam.title}</h1>
        <p>{exam.subtitle}</p>
      </header>

      <nav className="nb-idx" aria-label="Części egzaminu">
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
            Без словника й перекладача. Після відправлення побачиш результат і правильні відповіді.
          </p>
          <p className="mx-saved-note">
            Odpowiedzi zapisują się same. Jeśli zamkniesz okno, wrócisz w to samo miejsce. / Відповіді
            зберігаються автоматично: закриєш вікно — повернешся туди ж (у цьому ж браузері).
          </p>
          <p className="nb-note">Piszesz jako: <b>{imie}</b></p>
          <div className="nb-row">
            <button type="button" className="nb-btn" disabled={locked} onClick={start}>
              {startedAt != null ? 'Wracam do egzaminu' : 'Zaczynam'}
            </button>
          </div>
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
                Іспит на паузі: час не йде, відповіді збережені. Повернись, коли буде час, — завдання
                приховані до відновлення.
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
            ) : null}
            {!locked && sIndex === exam.sections.length - 1 && !confirming ? (
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

      {tab === 'wynik' && score ? (
        <ResultView
          exam={exam}
          score={score}
          saved={saved}
          imie={imie}
          onOpen={go}
          onRetake={() => {
            try {
              localStorage.removeItem(storeKey(storageId));
            } catch {
              /* ignore */
            }
            setScore(null);
            setSaved(null);
            setAnswers({});
            setStartedAt(null);
            go('start');
          }}
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
      <button type="button" className="nb-btn" disabled={state === 'idle' && left <= 0} onClick={play}>
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

function Writing({ task, ctx }: { task: Task; ctx: Ctx }) {
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
      {!choice && !ctx.locked ? <p className="nb-note">Wybierz jeden temat. / Обери одну тему.</p> : null}
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
      {ctx.locked ? <p className="mx-check-note">Tekst oceni nauczyciel. / Текст оцінить викладач.</p> : null}
    </div>
  );
}

/* ---------- result ---------- */

function ResultView({
  exam,
  score,
  saved,
  imie,
  onOpen,
  onRetake,
}: {
  exam: PublicMockExam;
  score: MockScore;
  saved: boolean | null;
  imie: string;
  onOpen: (t: Tab) => void;
  onRetake: () => void;
}) {
  const [askRetake, setAskRetake] = useState(false);
    const auto = score.sections.filter((s) => !s.manual);
  const manual = exam.sections.filter((s) => s.manual);
  const checks = score.tasks.reduce((a, t) => a + t.items.filter((r) => r.status === 'check').length, 0);
  const passPct = Math.round(exam.pass_ratio * 100);
  const telc = exam.scoring === 'telc';
  const lv = Object.entries(exam.levels ?? { B1: 27, B2: 43 }).sort((a, b) => a[1] - b[1]);
  return (
    <section className="mx-panel mx-result">
      <p className="nb-eyebrow">{imie}</p>
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

      {checks ? (
        <p className="mx-check-note">
          {checks} {checks === 1 ? 'odpowiedź otwartą' : 'odpowiedzi otwarte'} sprawdzi nauczyciel — na razie liczone jako 0
          p.
        </p>
      ) : null}
      {manual.map((s) => (
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
            {s.manual ? 'Twój tekst' : 'Zobacz błędy'}: {s.tab}
          </button>
        ))}
      </div>
      <p className="nb-note">
        {saved === false
          ? 'Wynik nie zapisał się u nauczyciela. Zrób zrzut ekranu i wyślij go.'
          : 'Wynik wysłany do nauczyciela. / Результат надіслано викладачеві.'}
      </p>
      <div className="nb-row mx-center">
        {askRetake ? (
          <>
            <span className="mx-retake-q">Wynik zniknie z tego ekranu (nauczyciel go ma). Zacząć od nowa?</span>
            <button type="button" className="nb-btn ghost" onClick={onRetake}>
              Tak, od nowa
            </button>
            <button type="button" className="nb-btn ghost" onClick={() => setAskRetake(false)}>
              Nie
            </button>
          </>
        ) : (
          <button type="button" className="mx-link" onClick={() => setAskRetake(true)}>
            Rozwiąż jeszcze raz
          </button>
        )}
      </div>
      {exam.source ? <p className="mx-source">Źródło zadań: {exam.source}</p> : null}
    </section>
  );
}

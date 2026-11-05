'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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

function storeKey(id: string) {
  return `werba-mock:${id}`;
}

type Stored = {
  imie?: string;
  answers?: Answers;
  startedAt?: number;
  tab?: Tab;
  result?: { score: MockScore; saved: boolean };
};

type Ctx = {
  answers: Answers;
  set: (id: string, v: string) => void;
  locked: boolean;
  results: Map<string, ItemResult>;
  focus: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
};

export function MockExam({ lessonId }: { lessonId: string }) {
  const [exam, setExam] = useState<PublicMockExam | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imie, setImie] = useState('');
  const [tab, setTab] = useState<Tab>('start');
  const [answers, setAnswers] = useState<Answers>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [score, setScore] = useState<MockScore | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const activeInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [showKeys, setShowKeys] = useState(false);
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
      const raw = localStorage.getItem(storeKey(lessonId));
      if (raw) {
        const s = JSON.parse(raw) as Stored;
        if (s.imie) setImie(s.imie);
        if (s.answers) setAnswers(s.answers);
        if (s.startedAt) setStartedAt(s.startedAt);
        if (s.result?.score) {
          setScore(s.result.score);
          setSaved(s.result.saved);
          setTab('wynik');
        } else if (s.tab && s.startedAt) {
          setTab(s.tab);
        }
      }
    } catch {
      /* storage unavailable */
    }
    const q = new URLSearchParams(window.location.search).get('imie');
    if (q) setImie((cur) => cur || q);
    setRestored(true);
  }, [lessonId]);

  useEffect(() => {
    if (!restored || startedAt == null) return;
    try {
      const data: Stored = {
        imie,
        answers,
        startedAt,
        tab,
        result: score ? { score, saved: Boolean(saved) } : undefined,
      };
      localStorage.setItem(storeKey(lessonId), JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [restored, answers, imie, startedAt, tab, score, saved, lessonId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  const results = useMemo(() => {
    const m = new Map<string, ItemResult>();
    for (const t of score?.tasks ?? []) for (const r of t.items) m.set(r.id, r);
    return m;
  }, [score]);

  const counts = useMemo(() => {
    const c: Record<string, { done: number; total: number }> = {};
    for (const s of exam?.sections ?? []) {
      const ids = s.tasks.flatMap(unitIds);
      c[s.id] = { done: ids.filter((id) => (answers[id] ?? '').trim()).length, total: ids.length };
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
  };

  const go = (t: Tab) => {
    setTab(t);
    setConfirming(false);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const start = () => {
    if (!imie.trim()) return;
    if (startedAt == null) setStartedAt(Date.now());
    go(exam.sections[0].id);
  };

  const missing = Object.values(counts).reduce((a, c) => a + (c.total - c.done), 0);
  const minutes = startedAt ? Math.max(0, Math.round((now - startedAt) / 60000)) : 0;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/mock-exam/${lessonId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imie: imie.trim(),
          answers,
          minutes: startedAt ? (Date.now() - startedAt) / 60000 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      setScore(data.score as MockScore);
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
        <p className="nb-eyebrow">egzamin próbny · B1</p>
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
        {startedAt != null && !locked ? <span className="mx-clock">{minutes} min</span> : null}
      </nav>

      {tab === 'start' ? (
        <section className="mx-panel">
          <h2 className="mx-h2">Zanim zaczniesz</h2>
          <ul className="mx-rules">
            {exam.sections.map((s) => (
              <li key={s.id}>
                <b>{s.title}</b> — {s.tasks.length} zadań, {s.max_points} p., na egzaminie {s.minutes} minut
              </li>
            ))}
            <li>Bez słownika i tłumacza. Możesz przechodzić między częściami.</li>
            <li>Na egzaminie trzeba mieć co najmniej 60% w każdej części.</li>
            <li>Po wysłaniu zobaczysz wynik i poprawne odpowiedzi.</li>
          </ul>
          <p className="nb-note">
            Без словника й перекладача. Після відправлення побачиш результат і правильні відповіді.
          </p>
          <p className="mx-saved-note">
            Odpowiedzi zapisują się same. Jeśli zamkniesz okno, wrócisz w to samo miejsce. / Відповіді
            зберігаються автоматично: закриєш вікно — повернешся туди ж (у цьому ж браузері).
          </p>
          <label className="mx-label" htmlFor="mx-imie">
            Imię i nazwisko / Ім&apos;я та прізвище
          </label>
          <input
            id="mx-imie"
            className="mx-name"
            value={imie}
            disabled={locked}
            onChange={(e) => setImie(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
            autoComplete="name"
          />
          <div className="nb-row">
            <button type="button" className="nb-btn" disabled={!imie.trim() || locked} onClick={start}>
              {startedAt != null ? 'Wracam do egzaminu' : 'Zaczynam'}
            </button>
          </div>
        </section>
      ) : null}

      {section ? (
        <section className="mx-panel">
          <h2 className="mx-h2">{section.title}</h2>
          {section.tasks.map((t) => (
            <TaskView key={t.id} task={t} ctx={ctx} />
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
              localStorage.removeItem(storeKey(lessonId));
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

function TaskView({ task, ctx }: { task: Task; ctx: Ctx }) {
  const pts = `${fmt(task.max_points)} p.`;
  return (
    <article className="mx-task">
      <div className="mx-task-head">
        <h3>{task.title}</h3>
        <span className="mx-pts">{pts}</span>
      </div>
      {task.topic ? <p className="mx-topic">{task.topic}</p> : null}
      {task.instruction ? <p className="mx-instr">{task.instruction}</p> : null}
      {task.layout === 'mc-passages' ? <McPassages task={task} ctx={ctx} /> : null}
      {task.layout === 'true-false' ? <TrueFalse task={task} ctx={ctx} /> : null}
      {task.layout === 'cloze' ? <Cloze task={task} ctx={ctx} /> : null}
      {task.layout === 'matching' ? <MatchingView task={task} ctx={ctx} /> : null}
      {task.layout === 'questions' ? <Questions task={task} ctx={ctx} /> : null}
      {task.layout === 'transform' ? <Transform task={task} ctx={ctx} /> : null}
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
      <p className="mx-mc-pass">
        {num}
        {passage}
      </p>
      <p className="mx-stem">{stem}</p>
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
        block(
          it.id,
          it.passage ?? '',
          it.stem ?? '',
          it.options ?? [],
          ctx.answers[it.id] ?? '',
          ctx.locked ? null : (l) => ctx.set(it.id, l),
          <span className="mx-num">{i + 1}. </span>,
          ctx.results.get(it.id)
        )
      )}
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
          {['TAK', 'NIE'].map((v) => {
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
          row(it.id, <span className="mx-num">{i + 1}. </span>, it.text ?? '', ctx.answers[it.id] ?? '', it.id)
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
  return (
    <>
      {task.passage_title ? <h4 className="mx-subtitle">{task.passage_title}</h4> : null}
      <div className="mx-match">
        <div className="mx-match-right">
          <p className="mx-col">Kolumna II</p>
          {(task.right ?? []).map((r) => (
            <div key={r.key} className={`mx-frag${used.has(r.key) ? ' used' : ''}${ex?.answer === r.key ? ' exm' : ''}`}>
              <b>{r.key}</b>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
        <div className="mx-match-left">
          <p className="mx-col">Kolumna I — tytuły</p>
          {ex ? (
            <div className="mx-title-row mx-example">
              <p>
                <span className="mx-exlabel">Przykład: </span>
                {String(ex.text)}
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
                <p>
                  <span className="mx-num">{i + 1}. </span>
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
                        disabled={ctx.locked || ex?.answer === k}
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
              <span className="mx-num">{i + 1}. </span>
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
              <span className="mx-num">{i + 1}. </span>
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
  const pct = score.max ? Math.round((score.total / score.max) * 100) : 0;
  return (
    <section className="mx-panel mx-result">
      <p className="nb-eyebrow">{imie}</p>
      <div className="mx-stamp">
        {fmt(score.total)}
        <small>/{score.max}</small>
      </div>
      <p className="mx-verdict">
        {score.passed
          ? 'Próg zaliczony w obu częściach.'
          : 'Na prawdziwym egzaminie potrzeba co najmniej 60% w każdej części.'}
      </p>

      <div className="mx-bars">
        {score.sections.map((s) => {
          const w = s.max ? (s.points / s.max) * 100 : 0;
          return (
            <div key={s.id} className="mx-bar-row">
              <div className="mx-bar-head">
                <b>{s.title}</b>
                <span className={s.passed ? 'mx-ok' : 'mx-no'}>
                  {fmt(s.points)}/{s.max} p. {s.passed ? '✓' : '✗'}
                </span>
              </div>
              <div className="mx-bar">
                <i style={{ width: `${w}%` }} className={s.passed ? 'pass' : 'fail'} />
                <em style={{ left: `${exam.pass_ratio * 100}%` }} title="próg 60%" />
              </div>
            </div>
          );
        })}
      </div>

      {score.pending ? (
        <p className="mx-check-note">
          {score.pending} {score.pending === 1 ? 'zdanie' : 'zdania'} z Zadania 6 sprawdzi nauczyciel — na razie liczone
          jako 0 p.
        </p>
      ) : null}

      <table className="mx-table">
        <tbody>
          {exam.sections.map((s) => (
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
                    <td className={t.points === t.max ? 'mx-ok' : t.points / t.max < 0.6 ? 'mx-no' : undefined}>
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
            Zobacz błędy: {s.tab}
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

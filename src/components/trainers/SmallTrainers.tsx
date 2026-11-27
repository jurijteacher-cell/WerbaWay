'use client';

/**
 * Невеликі тренажери A0: sluchaj-wybierz, czytaj-glosno, liczby, dialogi, czytanie.
 * Кожен — окреме вікно /embed/{lesson_id}/{тип}, дані — {lesson_id}-{тип}.json.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePersistentState } from '@/lib/embed-progress';
import { trackAttempt } from '@/lib/embed-tracker';
import { Anim, TrainerShell, burst, useSay, wait, type TrainerBase } from './core';
import { LetterQuiz, type QuizLetter } from './LetterQuiz';

/* ── Usłysz i wybierz ───────────────────────────────────────────────────── */

export type SluchajData = TrainerBase & { questions?: number; pool_groups?: string[]; letters: QuizLetter[] };

export function SluchajWybierz({ data }: { data: SluchajData }) {
  const pool = useMemo(
    () => data.letters.filter((l) => !data.pool_groups?.length || (l.g && data.pool_groups.includes(l.g))),
    [data.letters, data.pool_groups]
  );
  return (
    <TrainerShell data={data}>
      <LetterQuiz base={data.asset_base} pool={pool} all={data.letters} n={data.questions ?? 12} blockId="sluchaj-wybierz" />
    </TrainerShell>
  );
}

/* ── Wyzwanie: czytaj na głos ───────────────────────────────────────────── */

export type CzytajData = TrainerBase & {
  done_note_uk?: string;
  items: { id: string; w: string; h: string; a: string; anim?: string }[];
};

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function CzytajGlosno({ data }: { data: CzytajData }) {
  const base = data.asset_base;
  const say = useSay(base);
  const { value, setValue } = usePersistentState<{ best: Record<string, number> }>('czytaj-glosno', { best: {} });
  const best = value.best?.sec;
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(false);
  const [t0, setT0] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const it = data.items[i];

  const next = (el: HTMLElement) => {
    const start = t0 ?? Date.now();
    if (t0 == null) setT0(start);
    trackAttempt({
      blockId: 'czytaj-glosno',
      itemId: `czytaj-glosno:${it.id}`,
      itemType: 'read-aloud',
      grammarPoint: 'wymowa-glosek',
      prompt: it.w,
      answer: 'umiem',
      correct: null,
    });
    setHint(false);
    if (i + 1 >= data.items.length) {
      const sec = Math.max(1, Math.round((Date.now() - start) / 1000));
      setResult(sec);
      if (!best || sec < best) setValue((v) => ({ ...v, best: { sec } }));
      burst(el);
      return;
    }
    setI(i + 1);
  };
  const again = () => {
    setI(0);
    setT0(null);
    setResult(null);
    setHint(false);
  };

  if (result != null)
    return (
      <TrainerShell data={data}>
        <div className="done" data-state="done">
          <div className="label">Wyzwanie zaliczone</div>
          <div className="big">{fmt(result)}</div>
          <p className="mission" style={{ marginTop: 6 }}>
            Przeczytałeś <b>{data.items.length}</b> słów po polsku.{' '}
            {data.done_note_uk && <span>— {data.done_note_uk}</span>}
          </p>
          {best != null && <div className="best">Rekord: {fmt(Math.min(best, result))}</div>}
          <button type="button" className="ww-btn ww-btn-primary ww-btn-lg" style={{ marginTop: 12 }} onClick={again}>
            Jeszcze raz
          </button>
        </div>
      </TrainerShell>
    );

  return (
    <TrainerShell data={data}>
      <div className="read" data-item-id={`czytaj-glosno:${it.id}`} data-state="pending">
        <div className="label">
          Czytaj na głos — {i + 1} / {data.items.length}
        </div>
        {it.anim ? <Anim base={base} slug={it.anim} className="readanim" eager key={it.anim} /> : <div style={{ height: 24 }} />}
        <div className="readword" key={it.id}>
          {it.w}
        </div>
        <div className="readhint">{hint ? it.h : ''}</div>
        <div className="readbtns">
          <button type="button" className="ww-btn" data-role="play" onClick={() => say(it.a, it.w)}>
            🔊 Posłuchaj wzór
          </button>
          <button type="button" className="ww-btn" onClick={() => setHint(true)}>
            💡 Podpowiedź
          </button>
          <button type="button" className="ww-btn ww-btn-primary" data-role="check" onClick={(e) => next(e.currentTarget)}>
            Umiem →
          </button>
        </div>
        <div className="progress" style={{ marginTop: 22 }}>
          <div className="bar">
            <i style={{ width: `${Math.round((i / data.items.length) * 100)}%` }} />
          </div>
        </div>
        {best != null && <div className="best">Rekord: {fmt(best)}</div>}
      </div>
    </TrainerShell>
  );
}

/* ── Liczby ─────────────────────────────────────────────────────────────── */

export type LiczbyData = TrainerBase & { items: { d: string; w: string; u: string; a: string }[] };

export function Liczby({ data }: { data: LiczbyData }) {
  const say = useSay(data.asset_base);
  const [hot, setHot] = useState<string | null>(null);
  const run = useRef(0);
  useEffect(() => () => void (run.current++), []);
  const playAll = async () => {
    const my = ++run.current;
    for (const n of data.items) {
      if (run.current !== my) return;
      setHot(n.d);
      say(n.a, n.w);
      await wait(1150);
    }
    if (run.current === my) setHot(null);
  };
  return (
    <TrainerShell data={data}>
      <div className="nums">
        {data.items.map((n) => (
          <button
            type="button"
            key={n.d}
            className="num"
            data-item-id={`liczby:${n.d}`}
            data-role="play"
            aria-label={n.w}
            style={hot === n.d ? { transform: 'translateY(-4px)', boxShadow: '0 6px 0 var(--ww-edge)' } : undefined}
            onClick={() => say(n.a, n.w)}
          >
            <div className="d">{n.d}</div>
            <div className="pl">{n.w}</div>
            <div className="uk">{n.u}</div>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <button type="button" className="ww-btn ww-btn-primary" onClick={playAll}>
          ▶ Posłuchaj po kolei
        </button>
      </div>
    </TrainerShell>
  );
}

/* ── Dialogi ────────────────────────────────────────────────────────────── */

export type DialogiData = TrainerBase & {
  speakers: Record<string, string>;
  dialogs: { id: string; t: string; lines: { id: string; s: string; pl: string; tr: string; a: string }[] }[];
};

export function Dialogi({ data }: { data: DialogiData }) {
  const say = useSay(data.asset_base);
  const [showTr, setShowTr] = useState(false);
  const [hot, setHot] = useState<string | null>(null);
  const run = useRef(0);
  useEffect(() => () => void (run.current++), []);
  const playAll = async () => {
    const my = ++run.current;
    for (const d of data.dialogs)
      for (const l of d.lines) {
        if (run.current !== my) return;
        setHot(l.id);
        say(l.a, l.pl);
        await wait(1800);
      }
    if (run.current === my) setHot(null);
  };
  return (
    <TrainerShell data={data}>
      <div className="row" style={{ marginBottom: 14 }}>
        <button type="button" className="ww-btn" onClick={() => setShowTr((x) => !x)}>
          🌐 {showTr ? 'Ukryj tłumaczenie' : 'Pokaż tłumaczenie'}
        </button>
        <button type="button" className="ww-btn ww-btn-primary" onClick={playAll}>
          ▶ Odtwórz cały dialog
        </button>
      </div>
      {data.dialogs.map((d) => (
        <div key={d.id} className={`dlg${showTr ? ' show' : ''}`}>
          <h4>{d.t}</h4>
          <div className="dlg-lines">
            {d.lines.map((l) => (
              <button
                type="button"
                key={l.id}
                className={`bub ${l.s}${hot === l.id ? ' play' : ''}`}
                data-item-id={`dialogi:${l.id}`}
                data-role="play"
                onClick={() => say(l.a, l.pl)}
              >
                <span className="who">{data.speakers[l.s] ?? l.s}</span>
                {l.pl}
                <div className="tr">{l.tr}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </TrainerShell>
  );
}

/* ── Czytanie: mikroteksty ──────────────────────────────────────────────── */

export type CzytanieData = TrainerBase & { items: { id: string; k: string; style?: string; t: string; tr: string; a: string }[] };

export function Czytanie({ data }: { data: CzytanieData }) {
  const say = useSay(data.asset_base);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <TrainerShell data={data}>
      <div className="signs">
        {data.items.map((x) => (
          <button
            type="button"
            key={x.id}
            className={`sign ${x.style ?? ''}`}
            data-item-id={`czytanie:${x.id}`}
            data-role="flip"
            data-state={open[x.id] ? 'correct' : 'pending'}
            onClick={() => {
              say(x.a, x.t);
              setOpen((o) => ({ ...o, [x.id]: true }));
            }}
          >
            <div className="k">{x.k}</div>
            <div className="t">{x.t}</div>
            <div className="h">{open[x.id] ? x.tr : ''}</div>
          </button>
        ))}
      </div>
    </TrainerShell>
  );
}

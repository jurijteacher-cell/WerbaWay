'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { trackAttempt } from '@/lib/embed-tracker';
import { Anim, burst, shuffle, useSay } from './core';

export type QuizLetter = { c: string; w: string; a: string; t?: string; g?: string };

type Q = { target: QuizLetter; opts: QuizLetter[] };

function build(pool: QuizLetter[], all: QuizLetter[], n: number): Q[] {
  const out: Q[] = [];
  let bag: QuizLetter[] = [];
  for (let i = 0; i < n; i++) {
    if (!bag.length) bag = shuffle(pool);
    const target = bag.pop()!;
    const others = shuffle(all.filter((l) => l.c !== target.c)).slice(0, 3);
    out.push({ target, opts: shuffle([target, ...others]) });
  }
  return out;
}

/**
 * Звучить слово — учень обирає літеру, яка в ньому є. Звук не вмикається сам.
 * `blockId` — для результатів (sluchaj-wybierz / alfabet-check-<група>).
 */
export function LetterQuiz({
  base,
  pool,
  all,
  n,
  blockId,
  onDone,
}: {
  base: string;
  pool: QuizLetter[];
  all: QuizLetter[];
  n: number;
  blockId: string;
  onDone?: (score: number, total: number) => void;
}) {
  const say = useSay(base);
  const [seed, setSeed] = useState(0);
  // питання генеруються лише в браузері: на сервері Math.random дав би інший порядок (гідратація)
  const [qs, setQs] = useState<Q[] | null>(null);
  useEffect(() => setQs(build(pool, all, n)), [pool, all, n, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [played, setPlayed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const q = qs?.[i];
  const done = !!qs && i >= qs.length;
  const restart = () => {
    setSeed((s) => s + 1);
    setI(0);
    setScore(0);
    setStreak(0);
    setPicked(null);
    setPlayed(false);
  };

  const pick = (o: QuizLetter, el: HTMLElement) => {
    if (!q || picked) return;
    const ok = o.c === q.target.c;
    setPicked(o.c);
    trackAttempt({
      blockId,
      itemId: `${blockId}:${q.target.c}`,
      itemType: 'sluchaj-wybierz',
      grammarPoint: 'wymowa-glosek',
      prompt: q.target.w,
      answer: o.c,
      expected: q.target.c,
      correct: ok,
    });
    if (ok) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      burst(el);
    } else setStreak(0);
    timer.current = window.setTimeout(
      () => {
        setPicked(null);
        setPlayed(false);
        setI((x) => {
          const nx = x + 1;
          if (qs && nx >= qs.length) onDone?.(score + (ok ? 1 : 0), qs.length);
          return nx;
        });
      },
      ok ? 1100 : 1900
    );
  };

  const word = useMemo(() => (q && picked ? q.target : null), [q, picked]);

  if (!qs) return <div className="quiz" />;
  if (done)
    return (
      <div className="quiz" data-state="done">
        <div className="big">
          {score} / {qs.length}
        </div>
        <button type="button" className="ww-btn ww-btn-primary" style={{ marginTop: 12 }} onClick={restart}>
          Jeszcze raz
        </button>
      </div>
    );
  return (
    <div className="quiz" ref={boxRef}>
      <button
        type="button"
        className={`ww-btn ww-btn-primary ww-btn-lg${played ? '' : ' pulse'}`}
        data-role="play"
        onClick={() => {
          setPlayed(true);
          say(q!.target.a, q!.target.w);
        }}
      >
        🔊 Posłuchaj
      </button>
      <div className={`qanim${word ? ' on' : ''}`}>{word && <Anim base={base} slug={word.a} eager />}</div>
      {word && (
        <div className="readhint" style={{ fontStyle: 'normal' }}>
          <b>{word.w}</b>
          {word.t ? ` — ${word.t}` : ''}
        </div>
      )}
      <div className="qopts">
        {q!.opts.map((o) => {
          const state = !picked ? 'pending' : o.c === q!.target.c ? 'correct' : o.c === picked ? 'wrong' : 'pending';
          return (
            <button
              type="button"
              key={o.c}
              className={`qopt${state === 'correct' ? ' ok' : state === 'wrong' ? ' no' : ''}`}
              data-role="option"
              data-item-id={`${blockId}:${q!.target.c}`}
              data-state={state}
              data-correct={o.c === q!.target.c ? '' : undefined}
              onClick={(e) => pick(o, e.currentTarget)}
            >
              {o.c}
            </button>
          );
        })}
      </div>
      <div className="score">
        <span>
          Punkty: <b>{score}</b>
        </span>
        <span>
          Z rzędu: <b>{streak}</b>
        </span>
        <span>
          Pytanie: <b>{i + 1}</b>/{qs.length}
        </span>
      </div>
    </div>
  );
}

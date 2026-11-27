'use client';

import { useMemo, useRef, useState } from 'react';
import { usePersistentState } from '@/lib/embed-progress';
import { trackAttempt } from '@/lib/embed-tracker';
import { Anim, TrainerShell, burst, useSay, type TrainerBase } from './core';
import { LetterQuiz } from './LetterQuiz';

export type Letter = { c: string; n: string; s: string; w: string; t: string; g: string; a: string; r?: string };
export type AlfabetData = TrainerBase & {
  check_instruction_uk?: string;
  letter_groups: { id: string; icon: string; label: string }[];
  letters: Letter[];
};

const RODZ: Record<string, string> = {
  m: 'rodzaj męski · czyta mężczyzna',
  z: 'rodzaj żeński · czyta kobieta',
  n: 'rodzaj nijaki · czyta dziecko',
  pm: 'liczba mnoga · czyta mężczyzna',
  pz: 'liczba mnoga · czyta kobieta',
};

/** Сітка 32 літер + 7 двознаків: картка з літерою, словом, анімацією й озвучкою; кольорові групи; «Umiem». */
export function AlfabetTrainer({ data }: { data: AlfabetData }) {
  const base = data.asset_base;
  const say = useSay(base);
  const { value, setValue, reset } = usePersistentState<{ known: Record<string, boolean> }>('alfabet', { known: {} });
  const known = value.known ?? {};
  const [filter, setFilter] = useState<string>('all');
  const [cur, setCur] = useState<Letter | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => data.letters.filter((l) => filter === 'all' || l.g === filter), [data.letters, filter]);
  const knownCount = data.letters.filter((l) => known[l.c]).length;
  const pct = Math.round((knownCount / data.letters.length) * 100);
  const groupDone = filter !== 'all' && list.length > 0 && list.every((l) => known[l.c]);

  const open = (l: Letter) => {
    setCur(l);
    setChecking(null);
    requestAnimationFrame(() => stageRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  const toggle = (el: HTMLElement) => {
    if (!cur) return;
    const on = !known[cur.c];
    setValue((v) => ({ ...v, known: { ...(v.known ?? {}), [cur.c]: on } }));
    trackAttempt({
      blockId: 'alfabet',
      itemId: `alfabet:${cur.c}`,
      itemType: 'self-check',
      grammarPoint: 'wymowa-glosek',
      prompt: cur.c,
      answer: on ? 'umiem' : 'jeszcze nie',
      correct: null,
    });
    if (on) burst(el);
    setCur(null);
  };

  return (
    <TrainerShell data={data}>
      <div className="progress">
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="pcount">
          {knownCount} / {data.letters.length}
        </div>
        <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={reset}>
          Od nowa
        </button>
      </div>

      <div className="groups" role="tablist">
        <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Wszystko
        </button>
        {data.letter_groups.map((g) => (
          <button
            type="button"
            key={g.id}
            className="chip"
            aria-pressed={filter === g.id}
            onClick={() => {
              setFilter(g.id);
              setChecking(null);
            }}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      <div className="stage" ref={stageRef}>
        {cur && (
          <div className="card" data-g={cur.g} data-item-id={`alfabet:${cur.c}`} role="dialog" aria-label={`${cur.c} — ${cur.w}`}>
            <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm x" aria-label="Zamknij" onClick={() => setCur(null)}>
              ✕
            </button>
            <div className="lname">litera „{cur.n}”</div>
            <div className="bigch draw" key={cur.c}>
              {cur.c}
            </div>
            <div className="sound">
              {cur.s}
            </div>
            {cur.r && RODZ[cur.r] && <div className="rodz">{RODZ[cur.r]}</div>}
            <Anim base={base} slug={cur.a} className="animbig" eager key={`a-${cur.a}`} />
            <div className="word">{cur.w}</div>
            <div className="tr">{cur.t}</div>
            <div className="cardbtns">
              <button type="button" className="ww-btn" data-role="play" onClick={() => say(cur.a, cur.w)}>
                🔊 Posłuchaj
              </button>
              <button type="button" className="ww-btn ww-btn-primary" data-role="check" onClick={(e) => toggle(e.currentTarget)}>
                {known[cur.c] ? 'Jeszcze nie ✗' : 'Umiem ✓'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        {list.map((l) => (
          <button
            type="button"
            key={l.c}
            className={`tile${known[l.c] ? ' known' : ''}`}
            data-g={l.g}
            data-item-id={`alfabet:${l.c}`}
            data-state={known[l.c] ? 'correct' : 'pending'}
            aria-label={`${l.c} — ${l.w}`}
            onClick={() => open(l)}
          >
            <div className="box">
              <Anim base={base} slug={l.a} />
            </div>
            <span className="ch">{l.c}</span>
            <span className="wd">{l.w}</span>
          </button>
        ))}
      </div>

      {filter !== 'all' && (
        <div className="check">
          {checking === filter ? (
            <>
              {data.check_instruction_uk && <div className="qprompt">{data.check_instruction_uk}</div>}
              <LetterQuiz
                key={filter}
                base={base}
                pool={list}
                all={list.length >= 4 ? list : data.letters}
                n={Math.min(5, Math.max(3, list.length))}
                blockId={`alfabet-check-${filter}`}
              />
            </>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className={`ww-btn${groupDone ? ' ww-btn-primary' : ''}`} onClick={() => setChecking(filter)}>
                ✅ Sprawdź się: {Math.min(5, Math.max(3, list.length))} pytań
              </button>
            </div>
          )}
        </div>
      )}
    </TrainerShell>
  );
}

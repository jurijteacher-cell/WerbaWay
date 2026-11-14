'use client';

import { useMemo, useRef, useState } from 'react';
import { Headphones, Lightbulb, Play } from 'lucide-react';
import { AudioTransport } from './AudioTransport';
import { trackAttempt } from '@/lib/embed-tracker';
import { Feedback, ResetControl, RestoredNote } from './nb-ui';
import { usePersistentState } from '@/lib/embed-progress';

export type ExamItem = {
  id: string;
  statement?: string;
  question?: string;
  options?: string[];
  /** One correct option, or several: `["A", "B"]`. Other correct options may also go to `accept`. */
  answer: string | boolean | string[];
  accept?: string[];
  explanation?: string;
};

export type ExamBlock = {
  block_id: string;
  exam_skill?: string;
  exercise_type: string;
  title: string;
  instruction?: string;
  items: ExamItem[];
  transcript?: { speaker: string; line: string }[];
  max_plays?: number;
  audio_url?: string;
};

export type ExamExercise = {
  lesson_id: string;
  title: string;
  instruction?: string;
  blocks: ExamBlock[];
};

type Props = {
  data: ExamExercise;
  /** Optional filter: e1, e2 or e1,e2 */
  blockIds?: string[];
};

export function ExamTasks({ data, blockIds }: Props) {
  const blocks = useMemo(() => {
    if (!blockIds?.length) return data.blocks;
    const set = new Set(blockIds);
    return data.blocks.filter((b) => set.has(b.block_id));
  }, [data.blocks, blockIds]);

  type ExamSnap = {
    answers: Record<string, string>;
    checked: Record<string, boolean>;
    showExplain: Record<string, boolean>;
    plays: Record<string, number>;
  };
  const prog = usePersistentState<ExamSnap>('exam', { answers: {}, checked: {}, showExplain: {}, plays: {} });
  const field =
    <K extends keyof ExamSnap>(k: K) =>
    (fn: (cur: ExamSnap[K]) => ExamSnap[K]) =>
      prog.setValue((v) => ({ ...v, [k]: fn(v[k]) }));
  const { answers, checked, showExplain, plays } = prog.value;
  const setAnswers = field('answers');
  const setChecked = field('checked');
  const setShowExplain = field('showExplain');
  const setPlays = field('plays');
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [audioState, setAudioState] = useState<Record<string, 'playing' | 'paused'>>({});
  const setAud = (id: string, st: 'playing' | 'paused' | null) =>
    setAudioState((m) => {
      const n = { ...m };
      if (st) n[id] = st;
      else delete n[id];
      return n;
    });
  const audioRefFor = (id: string) => ({
    get current() {
      return audioRefs.current[id] ?? null;
    },
  });

  const correctSet = (item: ExamItem): string[] => {
    if (typeof item.answer === 'boolean') return [item.answer ? 'true' : 'false'];
    const list = Array.isArray(item.answer) ? item.answer.map(String) : [String(item.answer)];
    return [...list, ...(item.accept ?? [])];
  };
  const expected = (item: ExamItem) => correctSet(item)[0];

  const isCorrect = (item: ExamItem) => {
    const given = answers[item.id];
    if (given == null) return null;
    return correctSet(item).includes(given);
  };

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">jak na egzaminie</p>
        <h1>{data.title}</h1>
        {data.instruction ? <p>{data.instruction}</p> : null}
      </header>

      <RestoredNote show={prog.restored} onDismiss={prog.dismissRestored} />

      {blocks.map((block) => (
        <section key={block.block_id} data-block-id={block.block_id} style={{ marginBottom: 28 }}>
          <div className="nb-tape">{block.title}</div>
          {block.instruction ? <p className="nb-note">{block.instruction}</p> : null}

          {block.exercise_type === 'multiple-choice' ? (
            <div className="nb-panel" style={{ marginBottom: 14, background: 'var(--nb-paper-2)' }}>
              {block.audio_url ? (
                <>
                  <audio
                    ref={(el) => {
                      audioRefs.current[block.block_id] = el;
                    }}
                    src={block.audio_url}
                    preload="none"
                    onEnded={() => setAud(block.block_id, null)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px' }}>
                    <button
                      type="button"
                      className="nb-btn"
                      disabled={
                        !audioState[block.block_id] &&
                        block.max_plays != null &&
                        (plays[block.block_id] ?? 0) >= block.max_plays
                      }
                      onClick={() => {
                        const el = audioRefs.current[block.block_id];
                        if (!el) return;
                        const st = audioState[block.block_id];
                        if (st === 'playing') {
                          el.pause();
                          setAud(block.block_id, 'paused');
                          return;
                        }
                        if (st === 'paused') {
                          void el.play();
                          setAud(block.block_id, 'playing');
                          return;
                        }
                        const used = plays[block.block_id] ?? 0;
                        if (block.max_plays != null && used >= block.max_plays) return;
                        el.currentTime = 0;
                        void el.play();
                        setAud(block.block_id, 'playing');
                        setPlays((p) => ({ ...p, [block.block_id]: used + 1 }));
                      }}
                    >
                      <Play aria-hidden fill="currentColor" />{' '}
                      {audioState[block.block_id] === 'playing'
                        ? 'Pauza'
                        : audioState[block.block_id] === 'paused'
                          ? 'Wznów'
                          : 'Odsłuchaj'}
                      {block.max_plays != null
                        ? ` (${plays[block.block_id] ?? 0}/${block.max_plays})`
                        : ''}
                    </button>
                    <AudioTransport
                      audioRef={audioRefFor(block.block_id)}
                      enabled={!!audioState[block.block_id]}
                      onStop={() => setAud(block.block_id, 'paused')}
                    />
                  </div>
                </>
              ) : block.transcript?.length ? (
                <p className="nb-note" style={{ marginTop: 0 }}>
                  Przeczytaj dialog poniżej, potem odpowiedz.
                </p>
              ) : (
                <p className="nb-note" style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Headphones size={18} aria-hidden /> Słuchaj nauczyciela — bez tekstu.
                </p>
              )}
              {block.transcript?.length &&
              (!block.audio_url || block.items.every((it) => checked[it.id])) ? (
                <div className="nb-dialogue">
                  <p className="nb-eyebrow" style={{ marginBottom: 8 }}>Transkrypt rozmowy</p>
                  {block.transcript.map((line, i) => (
                    <p key={`${block.block_id}-t-${i}`}>
                      <strong>{line.speaker}</strong> {line.line}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {block.items.map((item, idx) => {
            const ok = checked[item.id] ? isCorrect(item) : null;
            const isTF = block.exercise_type === 'true-false';
            const label = (v: string | undefined) =>
              isTF ? (v === 'true' ? 'Prawda' : v === 'false' ? 'Fałsz' : v) : v;
            const check = (given: string) => {
              setAnswers((a) => ({ ...a, [item.id]: given }));
              setChecked((c) => ({ ...c, [item.id]: true }));
              trackAttempt({
                blockId: block.block_id,
                itemId: `${block.block_id}:${item.id}`,
                itemType: block.exercise_type,
                grammarPoint: block.exam_skill ?? null,
                prompt: (isTF ? item.statement : item.question) ?? null,
                answer: label(given) ?? '',
                expected: label(expected(item)) ?? null,
                correct: correctSet(item).includes(given),
              });
            };
            return (
              <div
                key={item.id}
                data-item-id={item.id}
                data-state={ok === true ? 'correct' : ok === false ? 'wrong' : 'pending'}
                className={`nb-panel nb-item${ok === true ? ' is-ok' : ok === false ? ' is-no' : ''}`}
              >
                <span className="nb-item-num" aria-hidden>
                  {idx + 1}
                </span>
                <div>
                  <p className="nb-q" style={{ marginBottom: 12 }}>
                    {isTF ? item.statement : item.question}
                  </p>

                  {isTF ? (
                    <div className="nb-tf-row" role="group" aria-label="Prawda czy fałsz">
                      {[
                        { v: 'true', label: 'Prawda' },
                        { v: 'false', label: 'Fałsz' },
                      ].map((opt) => {
                        const sel = answers[item.id] === opt.v;
                        return (
                          <button
                            key={opt.v}
                            type="button"
                            data-role="option"
                            data-value={opt.v}
                            aria-pressed={sel}
                            className={`nb-tf${sel ? ' sel' : ''}${sel && ok === true ? ' ok' : ''}${sel && ok === false ? ' no' : ''}`}
                            onClick={() => check(opt.v)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="nb-mc">
                      {(item.options ?? []).map((opt, oi) => {
                        const sel = answers[item.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            data-role="option"
                            data-value={opt}
                            aria-pressed={sel}
                            className={`nb-choice${sel ? ' sel' : ''}${sel && ok === true ? ' ok' : ''}${sel && ok === false ? ' no' : ''}`}
                            onClick={() => check(opt)}
                          >
                            <span className="nb-choice-key">{String.fromCharCode(65 + oi)}</span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {ok === true ? (
                    <Feedback
                      kind="ok"
                      action={
                        item.explanation ? (
                          <button
                            type="button"
                            className="nb-btn ghost sm"
                            onClick={() => setShowExplain((s) => ({ ...s, [item.id]: !s[item.id] }))}
                          >
                            <Lightbulb aria-hidden /> {showExplain[item.id] ? 'Ukryj' : 'Dlaczego?'}
                          </button>
                        ) : null
                      }
                    >
                      <b>Dobrze!</b>
                    </Feedback>
                  ) : null}
                  {ok === false ? (
                    <Feedback kind="no">
                      <b>Nie tym razem.</b> Przeczytaj jeszcze raz i wybierz inną odpowiedź.
                    </Feedback>
                  ) : null}
                  {showExplain[item.id] && item.explanation && ok === true ? (
                    <Feedback kind="hint">{item.explanation}</Feedback>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {Object.keys(answers).length ? (
        <div className="nb-nav">
          <span />
          <ResetControl onResetAll={prog.reset} />
          <span />
        </div>
      ) : null}
    </div>
  );
}

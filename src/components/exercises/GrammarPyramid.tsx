'use client';

import { useState } from 'react';
import type { GrammarPyramidExercise } from '@/content/queue-types';
import { SentenceBuilding } from './SentenceBuilding';

type Props = { data: GrammarPyramidExercise };

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function GrammarPyramid({ data }: Props) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({});

  const level = data.levels[levelIdx];
  if (!level) return null;

  const key = (id: number | string) => `${level.level}-${id}`;

  const check = (k: string, given: string, expected: string) => {
    setFeedback((f) => ({
      ...f,
      [k]: normalize(given) === normalize(expected),
    }));
  };

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">gramatyka</p>
        <h1>{data.title}</h1>
        {data.instructions ? <p>{data.instructions}</p> : null}
        <p className="nb-note">
          Poziom {level.level}: {level.name}
        </p>
        {level.instruction ? <p>{level.instruction}</p> : null}
      </header>

      <div className="nb-idx" role="tablist">
        {data.levels.map((l, i) => (
          <button
            key={l.level}
            type="button"
            role="tab"
            aria-selected={i === levelIdx}
            onClick={() => setLevelIdx(i)}
          >
            {l.level}. {l.name}
          </button>
        ))}
      </div>

      <div>
        {level.task_type === 'matching' &&
          level.items.map((item) => {
            const k = key(item.id);
            const fb = feedback[k];
            return (
              <div key={k} className="nb-panel">
                <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{item.prompt}</p>
                <div className="nb-row" style={{ marginTop: 0 }}>
                  <input
                    className={`nb-blank${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                    value={matchAnswers[k] ?? ''}
                    onChange={(e) => setMatchAnswers((a) => ({ ...a, [k]: e.target.value }))}
                    placeholder="Imiesłów / znaczenie…"
                  />
                  <button
                    type="button"
                    className="nb-btn"
                    onClick={() => check(k, matchAnswers[k] ?? '', item.answer ?? '')}
                  >
                    Sprawdź
                  </button>
                </div>
              </div>
            );
          })}

        {level.task_type === 'fill-in-blank' &&
          level.items.map((item) => {
            const k = key(item.id);
            const fb = feedback[k];
            return (
              <div key={k} className="nb-panel">
                <p style={{ margin: '0 0 8px' }}>{item.sentence}</p>
                {item.options?.length ? (
                  <div className="nb-row" style={{ marginTop: 0, marginBottom: 8 }}>
                    {item.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`nb-chip${fillAnswers[k] === opt ? ' sel' : ''}`}
                        onClick={() => setFillAnswers((a) => ({ ...a, [k]: opt }))}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="nb-row" style={{ marginTop: 0 }}>
                  {!item.options?.length && (
                    <input
                      className={`nb-blank${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                      value={fillAnswers[k] ?? ''}
                      onChange={(e) => setFillAnswers((a) => ({ ...a, [k]: e.target.value }))}
                    />
                  )}
                  <button
                    type="button"
                    className="nb-btn"
                    onClick={() => check(k, fillAnswers[k] ?? '', item.answer ?? '')}
                  >
                    Sprawdź
                  </button>
                  {fb === false && (
                    <span className="nb-note" style={{ margin: 0 }}>
                      {item.explanation ?? `oczekiwane: ${item.answer}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {level.task_type === 'sentence-building' &&
          level.items.map((item) => (
            <div key={key(item.id)} className="nb-panel">
              <SentenceBuilding words={item.words ?? []} answer={item.answer ?? ''} />
            </div>
          ))}

        {(level.task_type === 'open-answer' || level.task_type === 'text-transform') &&
          level.items.map((item) => {
            const k = key(item.id);
            const expected = item.answer_hint ?? item.answer;
            const fb = feedback[k];
            return (
              <div key={k} className="nb-panel">
                <p style={{ margin: '0 0 8px' }}>{item.prompt}</p>
                <textarea
                  value={openAnswers[k] ?? ''}
                  onChange={(e) => setOpenAnswers((a) => ({ ...a, [k]: e.target.value }))}
                  rows={3}
                  placeholder="Twoja odpowiedź…"
                  style={{
                    width: '100%',
                    font: 'inherit',
                    border: 0,
                    borderBottom: '2px dashed var(--nb-ink-soft)',
                    background: 'rgba(255,255,255,.55)',
                    padding: '6px 4px',
                    color: 'var(--nb-ink)',
                  }}
                />
                {expected && (
                  <div className="nb-row">
                    <button
                      type="button"
                      className="nb-btn"
                      onClick={() => check(k, openAnswers[k] ?? '', expected)}
                    >
                      Sprawdź
                    </button>
                    {fb === true && <span className="nb-score">Dobra robota!</span>}
                    {fb === false && (
                      <span className="nb-note" style={{ margin: 0 }}>
                        Podpowiedź: {expected}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

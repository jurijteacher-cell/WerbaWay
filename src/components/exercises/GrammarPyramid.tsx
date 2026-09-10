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
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl text-gold">{data.title}</h1>
        {data.instructions && <p className="mt-1 text-sm text-paper-muted">{data.instructions}</p>}
        <p className="mt-2 text-xs uppercase tracking-wide text-gold-dim">
          Poziom {level.level}: {level.name}
        </p>
        {level.instruction && <p className="mt-1 text-sm text-paper-muted">{level.instruction}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        {data.levels.map((l, i) => (
          <button
            key={l.level}
            type="button"
            onClick={() => setLevelIdx(i)}
            className={`rounded-lg px-3 py-1 text-xs ${
              i === levelIdx ? 'bg-gold text-ink' : 'border border-ink-line text-paper-muted'
            }`}
          >
            {l.level}. {l.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {level.task_type === 'matching' &&
          level.items.map((item) => {
            const k = key(item.id);
            return (
              <div key={k} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                <p className="mb-2 font-medium text-paper">{item.prompt}</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={matchAnswers[k] ?? ''}
                    onChange={(e) => setMatchAnswers((a) => ({ ...a, [k]: e.target.value }))}
                    placeholder="Imiesłów / znaczenie…"
                    className="min-w-[200px] flex-1 rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => check(k, matchAnswers[k] ?? '', item.answer ?? '')}
                    className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-ink"
                  >
                    Sprawdź
                  </button>
                  {feedback[k] === true && <span className="self-center text-correct">✓</span>}
                  {feedback[k] === false && <span className="self-center text-incorrect">✕</span>}
                </div>
              </div>
            );
          })}

        {level.task_type === 'fill-in-blank' &&
          level.items.map((item) => {
            const k = key(item.id);
            return (
              <div key={k} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                <p className="mb-2 text-paper">{item.sentence}</p>
                {item.options?.length ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {item.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFillAnswers((a) => ({ ...a, [k]: opt }))}
                        className={`rounded-lg border px-3 py-1 text-sm ${
                          fillAnswers[k] === opt
                            ? 'border-gold bg-gold text-ink'
                            : 'border-ink-line text-paper-muted'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {!item.options?.length && (
                    <input
                      value={fillAnswers[k] ?? ''}
                      onChange={(e) => setFillAnswers((a) => ({ ...a, [k]: e.target.value }))}
                      className="min-w-[160px] rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => check(k, fillAnswers[k] ?? '', item.answer ?? '')}
                    className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-ink"
                  >
                    Sprawdź
                  </button>
                  {feedback[k] === true && <span className="self-center text-correct">✓</span>}
                  {feedback[k] === false && (
                    <span className="self-center text-sm text-paper-muted">
                      {item.explanation ?? `✕ (oczekiwane: ${item.answer})`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {level.task_type === 'sentence-building' &&
          level.items.map((item) => (
            <div key={key(item.id)} className="rounded-lg border border-ink-line bg-ink-raised p-4">
              <SentenceBuilding words={item.words ?? []} answer={item.answer ?? ''} />
            </div>
          ))}

        {(level.task_type === 'open-answer' || level.task_type === 'text-transform') &&
          level.items.map((item) => {
            const k = key(item.id);
            const expected = item.answer_hint ?? item.answer;
            return (
              <div key={k} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                <p className="mb-2 text-paper">{item.prompt}</p>
                <textarea
                  value={openAnswers[k] ?? ''}
                  onChange={(e) => setOpenAnswers((a) => ({ ...a, [k]: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm"
                  placeholder="Twoja odpowiedź…"
                />
                {expected && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => check(k, openAnswers[k] ?? '', expected)}
                      className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-ink"
                    >
                      Sprawdź
                    </button>
                    {feedback[k] === true && <span className="self-center text-correct">✓</span>}
                    {feedback[k] === false && (
                      <span className="self-center text-sm text-paper-muted">Podpowiedź: {expected}</span>
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

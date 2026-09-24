'use client';

import { useState } from 'react';
import type { GrammarBoardExercise } from '@/content/queue-types';

type Props = { data: GrammarBoardExercise };

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function GrammarBoard({ data }: Props) {
  const [cardIdx, setCardIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({});

  const card = data.cards[cardIdx];
  if (!card) return null;

  const check = (k: string, given: string, expected: string) => {
    setFeedback((f) => ({
      ...f,
      [k]: normalize(given) === normalize(expected),
    }));
  };

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">tablica gramatyczna</p>
        <h1>{data.title}</h1>
        {data.instructions ? <p>{data.instructions}</p> : null}
      </header>

      <div className="nb-idx" role="tablist">
        {data.cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={i === cardIdx}
            onClick={() => setCardIdx(i)}
          >
            {c.number ?? i + 1}
          </button>
        ))}
      </div>

      <article className="nb-panel">
        {card.section ? (
          <p className="nb-note" style={{ marginTop: 0 }}>
            {card.section}
          </p>
        ) : null}
        {card.rubric ? <p style={{ fontWeight: 700, margin: '0 0 6px' }}>{card.rubric}</p> : null}
        {card.lead ? <p style={{ fontSize: '1.15rem', margin: '0 0 10px' }}>{card.lead}</p> : null}
        {card.rows?.length ? (
          <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
            {card.rows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        ) : null}
        {card.sticker ? (
          <p className="nb-sticky" style={{ display: 'inline-block', marginBottom: 14 }}>
            {card.sticker}
          </p>
        ) : null}

        {(card.tasks ?? []).map((task) => (
          <div key={task.task_id} style={{ marginTop: 14 }}>
            {task.instruction ? (
              <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{task.instruction}</p>
            ) : null}
            {(task.items ?? []).map((item) => {
              const k = `${card.id}-${task.task_id}-${item.id}`;
              const fb = feedback[k];
              const sentence = item.text ?? item.sentence ?? item.prompt ?? '';
              const expected = item.answer ?? '';
              return (
                <div key={k} style={{ marginBottom: 10 }}>
                  <p style={{ margin: '0 0 6px' }}>{sentence}</p>
                  {item.options?.length ? (
                    <div className="nb-row" style={{ marginTop: 0, marginBottom: 6 }}>
                      {item.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`nb-chip${answers[k] === opt ? ' sel' : ''}`}
                          onClick={() => setAnswers((a) => ({ ...a, [k]: opt }))}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className={`nb-blank${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                      value={answers[k] ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [k]: e.target.value }))}
                      placeholder="Odpowiedź…"
                    />
                  )}
                  <button
                    type="button"
                    className="nb-btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => check(k, answers[k] ?? '', expected)}
                  >
                    Sprawdź
                  </button>
                  {fb === true ? <span className="ok"> ✓</span> : null}
                  {fb === false ? <span className="no"> ✗</span> : null}
                </div>
              );
            })}
          </div>
        ))}
      </article>

      <div className="nb-row" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="nb-btn"
          disabled={cardIdx === 0}
          onClick={() => setCardIdx((i) => Math.max(0, i - 1))}
        >
          ← Poprzednia
        </button>
        <button
          type="button"
          className="nb-btn"
          disabled={cardIdx >= data.cards.length - 1}
          onClick={() => setCardIdx((i) => Math.min(data.cards.length - 1, i + 1))}
        >
          Następna →
        </button>
      </div>
    </div>
  );
}

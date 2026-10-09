'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { GrammarBoardExercise, GrammarBoardTaskItem } from '@/content/queue-types';
import { answersMatch as matchAnswer } from '@/lib/answer-match';

type Props = { data: GrammarBoardExercise };

function shuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function itemPrompt(item: GrammarBoardTaskItem) {
  return item.left ?? item.prompt ?? item.text ?? item.sentence ?? '';
}

function itemAnswer(item: GrammarBoardTaskItem) {
  return String(item.answer ?? item.right ?? '');
}

export function GrammarBoard({ data }: Props) {
  const [cardIdx, setCardIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({});
  const [matchLeft, setMatchLeft] = useState<Record<string, string | null>>({});
  const [matchPairs, setMatchPairs] = useState<Record<string, Record<string, string>>>({});

  const card = data.cards[cardIdx];
  if (!card) return null;

  const check = (k: string, given: string, expected: string) => {
    setFeedback((f) => ({
      ...f,
      [k]: matchAnswer(given, expected).ok,
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

        {(card.tasks ?? []).map((task) => {
          const type = task.exercise_type ?? 'fill-in-blank';
          const items = task.items ?? [];

          if (type === 'matching') {
            return (
              <MatchingTask
                key={task.task_id}
                taskId={task.task_id}
                cardId={String(card.id)}
                instruction={task.instruction}
                items={items}
                matchLeft={matchLeft}
                setMatchLeft={setMatchLeft}
                matchPairs={matchPairs}
                setMatchPairs={setMatchPairs}
              />
            );
          }

          return (
            <div key={task.task_id} style={{ marginTop: 14 }}>
              {task.instruction ? (
                <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{task.instruction}</p>
              ) : null}
              {items.map((item) => {
                const k = `${card.id}-${task.task_id}-${item.id}`;
                const fb = feedback[k];
                const sentence = itemPrompt(item);
                const expected = itemAnswer(item);
                return (
                  <div key={k} style={{ marginBottom: 12 }}>
                    {sentence ? <p style={{ margin: '0 0 6px' }}>{sentence}</p> : null}
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
                      style={{ marginTop: 6 }}
                      onClick={() => check(k, answers[k] ?? '', expected)}
                    >
                      Sprawdź
                    </button>
                    {fb === true ? <span className="ok"> ✓</span> : null}
                    {fb === false ? <span className="no"> ✗</span> : null}
                    {fb === false && expected ? (
                      <p className="nb-note" style={{ margin: '4px 0 0' }}>
                        → {expected}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
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

function MatchingTask({
  taskId,
  cardId,
  instruction,
  items,
  matchLeft,
  setMatchLeft,
  matchPairs,
  setMatchPairs,
}: {
  taskId: string;
  cardId: string;
  instruction?: string;
  items: GrammarBoardTaskItem[];
  matchLeft: Record<string, string | null>;
  setMatchLeft: Dispatch<SetStateAction<Record<string, string | null>>>;
  matchPairs: Record<string, Record<string, string>>;
  setMatchPairs: Dispatch<SetStateAction<Record<string, Record<string, string>>>>;
}) {
  const scope = `${cardId}-${taskId}`;
  const rights = useMemo(
    () => shuffle(items.map((it) => itemAnswer(it)).filter(Boolean), `board-${scope}`),
    [items, scope]
  );

  return (
    <div style={{ marginTop: 14 }}>
      {instruction ? <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{instruction}</p> : null}
      <p className="nb-note" style={{ margin: '0 0 8px' }}>
        Kliknij lewą stronę, potem prawą.
      </p>
      <div className="nb-row" style={{ marginTop: 0, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          {items.map((item) => {
            const id = String(item.id);
            const paired = matchPairs[scope]?.[id];
            const selected = matchLeft[scope] === id;
            const expected = itemAnswer(item);
            const ok = paired != null && paired === expected;
            return (
              <button
                key={id}
                type="button"
                className={`nb-chip${selected ? ' sel' : ''}${ok ? ' ok' : ''}${
                  paired && !ok ? ' no' : ''
                }`}
                onClick={() => setMatchLeft((m) => ({ ...m, [scope]: id }))}
              >
                {itemPrompt(item)}
                {paired ? ` → ${paired}` : ''}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          {rights.map((right) => {
            const used = Object.values(matchPairs[scope] ?? {}).includes(right);
            return (
              <button
                key={right}
                type="button"
                className={`nb-chip${used ? ' ok' : ''}`}
                disabled={used}
                onClick={() => {
                  const leftId = matchLeft[scope];
                  if (!leftId) return;
                  const item = items.find((it) => String(it.id) === leftId);
                  if (!item) return;
                  const correct = matchAnswer(right, itemAnswer(item)).ok;
                  if (correct) {
                    setMatchPairs((p) => ({
                      ...p,
                      [scope]: { ...(p[scope] ?? {}), [leftId]: right },
                    }));
                  } else {
                    const btn = document.activeElement as HTMLElement | null;
                    btn?.classList.add('nb-shake');
                    setTimeout(() => btn?.classList.remove('nb-shake'), 400);
                  }
                  setMatchLeft((m) => ({ ...m, [scope]: null }));
                }}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

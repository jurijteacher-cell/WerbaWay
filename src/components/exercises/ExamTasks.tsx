'use client';

import { useMemo, useState } from 'react';

export type ExamItem = {
  id: string;
  statement?: string;
  question?: string;
  options?: string[];
  answer: string | boolean;
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

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showExplain, setShowExplain] = useState<Record<string, boolean>>({});

  const expected = (item: ExamItem) => {
    if (typeof item.answer === 'boolean') return item.answer ? 'true' : 'false';
    return String(item.answer);
  };

  const isCorrect = (item: ExamItem) => {
    const given = answers[item.id];
    if (given == null) return null;
    return given === expected(item);
  };

  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">jak na egzaminie</p>
        <h1>{data.title}</h1>
        {data.instruction ? <p>{data.instruction}</p> : null}
      </header>

      {blocks.map((block) => (
        <section key={block.block_id} style={{ marginBottom: 28 }}>
          <div className="nb-tape" style={{ marginBottom: 10 }}>
            {block.title}
          </div>
          {block.instruction ? <p className="nb-note">{block.instruction}</p> : null}

          {block.transcript?.length ? (
            <div className="nb-panel" style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Transkrypt rozmowy</p>
              <p className="nb-note" style={{ marginTop: 0 }}>
                Nagranie TTS w przygotowaniu — przeczytaj dialog, potem odpowiedz.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {block.transcript.map((line, i) => (
                  <p key={`${block.block_id}-t-${i}`} style={{ margin: 0 }}>
                    <strong>{line.speaker}:</strong> {line.line}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {block.items.map((item, idx) => {
            const ok = checked[item.id] ? isCorrect(item) : null;
            return (
              <div key={item.id} className="nb-panel" style={{ marginBottom: 12 }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700 }}>
                  {idx + 1}.{' '}
                  {block.exercise_type === 'true-false' ? item.statement : item.question}
                </p>

                {block.exercise_type === 'true-false' ? (
                  <div className="nb-row" style={{ marginTop: 0, gap: 8 }}>
                    {[
                      { v: 'true', label: 'Prawda' },
                      { v: 'false', label: 'Fałsz' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        className={`nb-btn${answers[item.id] === opt.v ? '' : ' ghost'}`}
                        onClick={() => {
                          setAnswers((a) => ({ ...a, [item.id]: opt.v }));
                          setChecked((c) => ({ ...c, [item.id]: false }));
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(item.options ?? []).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`nb-btn${answers[item.id] === opt ? '' : ' ghost'}`}
                        style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                        onClick={() => {
                          setAnswers((a) => ({ ...a, [item.id]: opt }));
                          setChecked((c) => ({ ...c, [item.id]: false }));
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                <div className="nb-row" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="nb-btn"
                    disabled={answers[item.id] == null}
                    onClick={() => setChecked((c) => ({ ...c, [item.id]: true }))}
                  >
                    Sprawdź
                  </button>
                  {checked[item.id] && item.explanation ? (
                    <button
                      type="button"
                      className="nb-btn ghost"
                      onClick={() =>
                        setShowExplain((s) => ({ ...s, [item.id]: !s[item.id] }))
                      }
                    >
                      {showExplain[item.id] ? 'Ukryj wyjaśnienie' : 'Wyjaśnienie'}
                    </button>
                  ) : null}
                </div>

                {ok === true ? (
                  <p className="nb-note" style={{ color: 'var(--nb-ok, #2f7d32)' }}>
                    Dobrze!
                  </p>
                ) : null}
                {ok === false ? (
                  <p className="nb-note" style={{ color: 'var(--nb-no, #b42318)' }}>
                    Nie tym razem.
                  </p>
                ) : null}
                {showExplain[item.id] && item.explanation ? (
                  <p className="nb-note">{item.explanation}</p>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

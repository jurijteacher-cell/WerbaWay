'use client';

import { useState } from 'react';
import type { HomeworkExercise } from '@/content/queue-types';
import { SentenceBuilding } from './SentenceBuilding';
import { GrammarPyramid } from './GrammarPyramid';
import { SendToTeacher } from './SendToTeacher';
import { trackAttempt } from '@/lib/embed-tracker';

type Props = { data: HomeworkExercise };

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function HomeworkEmbed({ data }: Props) {
  const [fills, setFills] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, boolean | null>>({});
  const [writing, setWriting] = useState('');
  const [open, setOpen] = useState<Record<number, string>>({});

  if (data.levels?.length) {
    return (
      <GrammarPyramid
        data={{
          lesson_id: data.lesson_id,
          exercise_type: data.exercise_type,
          title: data.title,
          instructions: data.instructions,
          instructions_uk: data.instructions_uk,
          eyebrow: data.eyebrow,
          levels: data.levels,
        }}
      />
    );
  }

  // Embed-only (light notebook theme): nb-* classes only, never dark site tokens.
  return (
    <div>
      <header className="nb-head">
        <p className="nb-eyebrow">{data.eyebrow ?? 'praca domowa'}</p>
        <h1>{data.title}</h1>
      </header>

      {data.vocab_review && (
        <div className="nb-panel">
          <p className="nb-eyebrow">Słownictwo</p>
          <p style={{ margin: 0 }}>{data.vocab_review}</p>
        </div>
      )}

      {data.video && (
        <div className="nb-panel">
          <p className="nb-eyebrow">Wideo / artykuł</p>
          <a href={data.video.url} target="_blank" rel="noreferrer" style={{ color: 'var(--nb-ink)', fontWeight: 700 }}>
            {data.video.title}
          </a>
          <p className="nb-note" style={{ margin: '6px 0 0' }}>{data.video.task}</p>
        </div>
      )}

      {data.grammar_exercises && (
        <section>
          <p className="nb-eyebrow">Gramatyka</p>
          {data.grammar_exercises.map((ex) => {
            if (ex.words && ex.answer) {
              return (
                <div key={ex.id} className="nb-panel">
                  <SentenceBuilding
                    words={ex.words}
                    answer={ex.answer}
                    onCheck={(given, ok) =>
                      trackAttempt({
                        blockId: 'gramatyka',
                        itemId: `hw:${ex.id}`,
                        itemType: 'sentence-building',
                        prompt: ex.words?.join(' / ') ?? null,
                        answer: given,
                        expected: ex.answer ?? null,
                        correct: ok,
                      })
                    }
                  />
                </div>
              );
            }
            if (ex.sentence && ex.answer) {
              const fb = feedback[ex.id];
              return (
                <div key={ex.id} className="nb-panel">
                  <p style={{ margin: '0 0 8px' }}>{ex.sentence}</p>
                  <div className="nb-row" style={{ marginTop: 0 }}>
                    <input
                      value={fills[ex.id] ?? ''}
                      onChange={(e) => setFills((f) => ({ ...f, [ex.id]: e.target.value }))}
                      className={`nb-blank${fb === true ? ' ok' : ''}${fb === false ? ' no' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const ok = normalize(fills[ex.id] ?? '') === normalize(ex.answer ?? '');
                        setFeedback((f) => ({ ...f, [ex.id]: ok }));
                        trackAttempt({
                          blockId: 'gramatyka',
                          itemId: `hw:${ex.id}`,
                          itemType: 'fill-in-blank',
                          prompt: ex.sentence ?? null,
                          answer: fills[ex.id] ?? '',
                          expected: ex.answer ?? null,
                          correct: ok,
                        });
                      }}
                      className="nb-btn"
                    >
                      Sprawdź
                    </button>
                    {fb === true && <span className="nb-score">Dobra robota!</span>}
                    {fb === false && (
                      <span className="nb-note" style={{ margin: 0 }}>
                        ✕ Spróbuj ponownie
                      </span>
                    )}
                  </div>
                </div>
              );
            }
            if (ex.prompt) {
              return (
                <div key={ex.id} className="nb-panel">
                  <p style={{ margin: '0 0 8px' }}>{ex.prompt}</p>
                  <textarea
                    rows={3}
                    className="nb-open"
                    placeholder="Twoja odpowiedź…"
                    value={open[ex.id] ?? ''}
                    onChange={(e) => setOpen((o) => ({ ...o, [ex.id]: e.target.value }))}
                  />
                  <SendToTeacher
                    text={open[ex.id] ?? ''}
                    attempt={{ blockId: 'gramatyka', itemId: `hw:${ex.id}`, itemType: 'open-answer', prompt: ex.prompt ?? null }}
                  />
                </div>
              );
            }
            return null;
          })}
        </section>
      )}

      {data.writing_task && (
        <div className="nb-panel">
          <p className="nb-eyebrow">Pisanie ({data.writing_task.type})</p>
          <p style={{ margin: '0 0 8px' }}>{data.writing_task.prompt}</p>
          <textarea
            value={writing}
            onChange={(e) => setWriting(e.target.value)}
            rows={6}
            className="nb-open"
          />
          <SendToTeacher
            text={writing}
            attempt={{
              blockId: 'pisanie',
              itemId: 'hw:writing',
              itemType: 'writing',
              prompt: data.writing_task.prompt,
            }}
          />
        </div>
      )}
    </div>
  );
}

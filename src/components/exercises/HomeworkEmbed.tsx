'use client';

import type { HomeworkExercise } from '@/content/queue-types';
import { SentenceBuilding } from './SentenceBuilding';
import { GrammarPyramid } from './GrammarPyramid';
import { SendToTeacher } from './SendToTeacher';
import { trackAttempt } from '@/lib/embed-tracker';
import { Feedback, PolishKeys, ResetControl, RestoredNote } from './nb-ui';
import { usePersistentState } from '@/lib/embed-progress';

type Props = { data: HomeworkExercise };

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function HomeworkEmbed({ data }: Props) {
  type HwSnap = {
    fills: Record<number, string>;
    feedback: Record<number, boolean | null>;
    writing: string;
    open: Record<number, string>;
  };
  const prog = usePersistentState<HwSnap>('hw-legacy', { fills: {}, feedback: {}, writing: '', open: {} });
  const { fills, feedback, writing, open } = prog.value;
  const setFills = (fn: (v: HwSnap['fills']) => HwSnap['fills']) => prog.setValue((v) => ({ ...v, fills: fn(v.fills) }));
  const setFeedback = (fn: (v: HwSnap['feedback']) => HwSnap['feedback']) =>
    prog.setValue((v) => ({ ...v, feedback: fn(v.feedback) }));
  const setOpen = (fn: (v: HwSnap['open']) => HwSnap['open']) => prog.setValue((v) => ({ ...v, open: fn(v.open) }));
  const setWriting = (w: string) => prog.setValue((v) => ({ ...v, writing: w }));

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
      <RestoredNote show={prog.restored} onDismiss={prog.dismissRestored} />

      {data.vocab_review && (
        <div className="nb-panel">
          <p className="nb-eyebrow">Słownictwo</p>
          <p className="nb-q" style={{ fontSize: 16 }}>{data.vocab_review}</p>
        </div>
      )}

      {data.video && (
        <div className="nb-panel">
          <p className="nb-eyebrow">Wideo / artykuł</p>
          <a href={data.video.url} target="_blank" rel="noreferrer" className="nb-link">
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
                  <p className="nb-q">{ex.sentence}</p>
                  <div className="nb-row" style={{ marginTop: 10 }}>
                    <input
                      value={fills[ex.id] ?? ''}
                      onChange={(e) => {
                        setFills((f) => ({ ...f, [ex.id]: e.target.value }));
                        setFeedback((f) => ({ ...f, [ex.id]: null }));
                      }}
                      placeholder="Twoja odpowiedź…"
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
                  </div>
                  {fb === true && <Feedback kind="ok"><b>Dobra robota!</b></Feedback>}
                  {fb === false && <Feedback kind="no">Jeszcze nie. Spróbuj ponownie.</Feedback>}
                </div>
              );
            }
            if (ex.prompt) {
              return (
                <div key={ex.id} className="nb-panel">
                  <p className="nb-q" style={{ marginBottom: 10 }}>{ex.prompt}</p>
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
          <p className="nb-q" style={{ marginBottom: 10 }}>{data.writing_task.prompt}</p>
          <textarea
            value={writing}
            onChange={(e) => setWriting(e.target.value)}
            rows={6}
            className="nb-open"
            placeholder="Pisz tutaj…"
          />
          <div className="nb-row" style={{ marginTop: 6 }}>
            <span className="nb-counter">{writing.trim() ? writing.trim().split(/\s+/).length : 0} słów</span>
          </div>
          <PolishKeys />
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

      <div className="nb-nav">
        <span />
        <ResetControl onResetAll={prog.reset} />
        <span />
      </div>
    </div>
  );
}

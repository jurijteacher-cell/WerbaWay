'use client';

import { useState } from 'react';
import type { HomeworkExercise } from '@/content/queue-types';
import { SentenceBuilding } from './SentenceBuilding';

type Props = { data: HomeworkExercise };

function normalize(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function HomeworkEmbed({ data }: Props) {
  const [fills, setFills] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, boolean | null>>({});
  const [writing, setWriting] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">{data.title}</h1>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-gold-dim">Słownictwo</h2>
        <p className="text-paper">{data.vocab_review}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-gold-dim">Wideo / artykuł</h2>
        <a
          href={data.video.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-gold underline"
        >
          {data.video.title}
        </a>
        <p className="text-sm text-paper-muted">{data.video.task}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wide text-gold-dim">Gramatyka</h2>
        {data.grammar_exercises.map((ex) => {
          if (ex.words && ex.answer) {
            return (
              <div key={ex.id} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                <SentenceBuilding words={ex.words} answer={ex.answer} />
              </div>
            );
          }
          if (ex.sentence && ex.answer) {
            return (
              <div key={ex.id} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                <p className="mb-2 text-paper">{ex.sentence}</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={fills[ex.id] ?? ''}
                    onChange={(e) => setFills((f) => ({ ...f, [ex.id]: e.target.value }))}
                    className="rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFeedback((f) => ({
                        ...f,
                        [ex.id]: normalize(fills[ex.id] ?? '') === normalize(ex.answer ?? ''),
                      }))
                    }
                    className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-ink"
                  >
                    Sprawdź
                  </button>
                  {feedback[ex.id] === true && <span className="self-center text-correct">✓</span>}
                  {feedback[ex.id] === false && <span className="self-center text-incorrect">✕</span>}
                </div>
              </div>
            );
          }
          if (ex.prompt) {
            return (
              <div key={ex.id} className="rounded-lg border border-ink-line bg-ink-raised p-4">
                <p className="mb-2 text-paper">{ex.prompt}</p>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm"
                  placeholder="Twoja odpowiedź…"
                />
              </div>
            );
          }
          return null;
        })}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-gold-dim">
          Pisanie ({data.writing_task.type})
        </h2>
        <p className="text-paper">{data.writing_task.prompt}</p>
        <textarea
          value={writing}
          onChange={(e) => setWriting(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm"
        />
      </section>
    </div>
  );
}

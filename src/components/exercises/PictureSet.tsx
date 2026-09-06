'use client';

import { useState } from 'react';

type Item = {
  id: number;
  question: string;
  image_url?: string;
  image_keywords?: string;
};

type Props = {
  title: string;
  instructions?: string;
  items: Item[];
};

export function PictureSet({ title, instructions, items }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold">{title}</h1>
        {instructions && <p className="mt-1 text-sm text-paper-muted">{instructions}</p>}
      </header>

      <div className="space-y-8">
        {items.map((item) => (
          <figure key={item.id} className="space-y-3">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.question}
                className="h-56 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-ink-line text-sm text-paper-muted">
                Brak obrazka
              </div>
            )}
            <figcaption className="text-paper">{item.question}</figcaption>
            <textarea
              value={answers[item.id] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))}
              rows={2}
              placeholder="Twoja odpowiedź…"
              className="w-full rounded-lg border border-ink-line bg-ink-soft px-3 py-2 text-sm text-paper placeholder:text-paper-muted"
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
